import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import {
  STRIPE_SUCCESSFUL_EVENT_TYPES,
  STRIPE_FAILED_EVENT_TYPES,
  STRIPE_REFUNDED_EVENT_TYPES,
} from "@/lib/config/constants";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  async function doEventHandling() {
    if (typeof signature !== "string") {
      throw new Error("Invalid Stripe signature");
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Stripe not configured");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await handleEvent(event);
  }

  try {
    await doEventHandling();
  } catch (error) {
    console.error("Stripe processing error: ", error);
    return NextResponse.json(
      { error: "Stripe processing error. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleEvent(event: Stripe.Event) {
  if (
    !STRIPE_SUCCESSFUL_EVENT_TYPES.includes(event.type) &&
    !STRIPE_FAILED_EVENT_TYPES.includes(event.type) &&
    !STRIPE_REFUNDED_EVENT_TYPES.includes(event.type)
  ) {
    return;
  }

  const supabase = getSupabaseAdmin();

  // ─── checkout.session.completed ──────────────────────────────────────
  if (STRIPE_SUCCESSFUL_EVENT_TYPES.includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const workshopId = session.metadata?.workshopId;
    const pricingTierId = session.metadata?.pricingTierId;
    const bundleSize = parseInt(session.metadata?.bundleSize ?? "1", 10);
    const customerEmail =
      session.customer_details?.email ?? session.customer_email;

    console.log(
      `[webhook] Payment succeeded: workshop=${workshopId}, session=${session.id}, email=${customerEmail}`
    );

    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? "";
    const stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? "";

    // 1. Try to find a matching user by their email in user_profiles
    //    (so payment links to their MentorMates account if they have one)
    let userId: string | null = null;
    if (customerEmail) {
      // Look up in Supabase Auth users
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const matchedUser = authUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()
      );
      if (matchedUser) {
        userId = matchedUser.id;
        console.log(
          `[webhook] Matched email ${customerEmail} to user ${userId}`
        );
      } else {
        console.log(
          `[webhook] No MentorMates account for ${customerEmail} — recording payment without user`
        );
      }
    }

    // 2. Create or update the payment record → "paid"
    //    user_id is required in the DB, so we skip the record if no user found
    let paymentId: string | null = null;

    if (userId) {
      // Try upsert (user_id + event_id is unique)
      const { data: payment, error: paymentErr } = await supabase
        .from("user_event_payments")
        .upsert(
          {
            user_id: userId,
            event_id: workshopId,
            stripe_customer_id: stripeCustomerId,
            stripe_session_id: session.id,
            stripe_payment_intent_id: stripePaymentIntentId,
            payment_status: "paid",
            amount_paid: session.amount_total,
            currency: session.currency,
            pricing_id: pricingTierId || null,
          },
          { onConflict: "user_id,event_id" }
        )
        .select("id, event_id, user_id, pricing_id")
        .single();

      if (paymentErr || !payment) {
        console.error("[webhook] Failed to upsert payment:", paymentErr);
        throw new Error("Failed to create payment record");
      }

      paymentId = payment.id;
      console.log(`[webhook] Payment record: ${paymentId} (user: ${userId})`);
    } else {
      console.log(
        `[webhook] Skipping DB payment record — no matching user for ${customerEmail}. Stripe has the record.`
      );
    }

    // 3. Create tickets (only if we have a payment record in DB)
    if (!paymentId) {
      console.log(
        `[webhook] ✓ Payment collected by Stripe (no DB record — guest purchase). Email: ${customerEmail}`
      );
      return;
    }

    // Fetch pricing tier for bundle_size
    let actualBundleSize = bundleSize;
    if (pricingTierId) {
      const { data: pricingData } = await supabase
        .from("pricing_tiers")
        .select("bundle_size")
        .eq("id", pricingTierId)
        .single();
      if (pricingData) {
        actualBundleSize = pricingData.bundle_size ?? 1;
      }
    }

    // 4. Create tickets
    const ticketRows = Array.from({ length: actualBundleSize }, () => ({
      event_id: workshopId,
      payment_id: paymentId,
      purchased_by_user_id: userId,
      ticket_status: "unassigned" as const,
    }));

    const { data: tickets, error: ticketErr } = await supabase
      .from("event_tickets")
      .insert(ticketRows)
      .select("id");

    if (ticketErr) {
      console.error("[webhook] Failed to create tickets:", ticketErr);
      // Don't throw — payment is still recorded
    } else {
      console.log(
        `[webhook] Created ${tickets?.length} ticket(s) for payment ${paymentId}`
      );

      // 4. Auto-assign first ticket if we have a user
      if (tickets && tickets.length > 0 && userId) {
        await supabase
          .from("event_tickets")
          .update({
            assigned_to_user_id: userId,
            assigned_to_email: customerEmail,
            ticket_status: "assigned",
          })
          .eq("id", tickets[0].id);

        console.log(
          `[webhook] Auto-assigned ticket ${tickets[0].id} to user ${userId}`
        );
      } else if (tickets && tickets.length > 0 && customerEmail) {
        // No user account — store email on ticket for later matching
        await supabase
          .from("event_tickets")
          .update({
            assigned_to_email: customerEmail,
            ticket_status: "assigned",
          })
          .eq("id", tickets[0].id);

        console.log(
          `[webhook] Assigned ticket ${tickets[0].id} to email ${customerEmail}`
        );
      }
    }

    // 5. Increment current_quantity on the pricing tier
    if (pricingTierId) {
      const { data: tierData } = await supabase
        .from("pricing_tiers")
        .select("current_quantity")
        .eq("id", pricingTierId)
        .single();

      if (tierData) {
        await supabase
          .from("pricing_tiers")
          .update({
            current_quantity: (tierData.current_quantity ?? 0) + 1,
          })
          .eq("id", pricingTierId);
      }
    }

    console.log(
      `[webhook] ✓ Complete: workshop=${workshopId}, payment=${paymentId}, tickets=${tickets?.length ?? 0}`
    );
  }

  // ─── checkout.session.expired (failed/cancelled) ─────────────────────
  else if (STRIPE_FAILED_EVENT_TYPES.includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log(`[webhook] Payment failed/expired: session=${session.id}`);

    const { error } = await supabase
      .from("user_event_payments")
      .update({ payment_status: "canceled" })
      .eq("stripe_session_id", session.id);

    if (error) {
      console.error("[webhook] Failed to update canceled payment:", error);
    }
  }

  // ─── charge.refunded ─────────────────────────────────────────────────
  else if (STRIPE_REFUNDED_EVENT_TYPES.includes(event.type)) {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    console.log(`[webhook] Refund: payment_intent=${paymentIntentId}`);

    // 1. Mark payment as refunded
    const { data: payment, error: paymentErr } = await supabase
      .from("user_event_payments")
      .update({ payment_status: "refunded" })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .select("id, event_id, user_id")
      .single();

    if (paymentErr || !payment) {
      console.error("[webhook] Failed to find payment for refund:", paymentErr);
      return;
    }

    // 2. Delete tickets for this payment
    const { data: deletedTickets } = await supabase
      .from("event_tickets")
      .delete()
      .eq("payment_id", payment.id)
      .select("id");

    console.log(
      `[webhook] Refund complete: deleted ${deletedTickets?.length ?? 0} ticket(s)`
    );

    // 3. Remove user event role if exists
    if (payment.user_id) {
      await supabase
        .from("user_event_roles")
        .delete()
        .eq("event_id", payment.event_id)
        .eq("user_id", payment.user_id);
    }
  }
}
