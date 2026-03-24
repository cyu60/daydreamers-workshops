import { stripe } from "@/lib/stripe";
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

  const session = event.data.object as Stripe.Checkout.Session;
  const workshopId = session.metadata?.workshopId;
  const workshopSlug = session.metadata?.workshopSlug;

  if (STRIPE_SUCCESSFUL_EVENT_TYPES.includes(event.type)) {
    console.log(
      `Payment succeeded for workshop ${workshopSlug} (${workshopId}), session ${session.id}`
    );
    // TODO: Decrement spots remaining in Notion/Supabase
    // TODO: Send confirmation email via Resend
  } else if (STRIPE_FAILED_EVENT_TYPES.includes(event.type)) {
    console.log(
      `Payment failed/expired for workshop ${workshopSlug}, session ${session.id}`
    );
  } else if (STRIPE_REFUNDED_EVENT_TYPES.includes(event.type)) {
    console.log(
      `Payment refunded for workshop ${workshopSlug}, session ${session.id}`
    );
    // TODO: Increment spots remaining
  }
}
