import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getWorkshops } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const origin = (await headers()).get("origin");
    const { workshopId, pricingTierId } = await req.json();

    if (!workshopId) {
      return NextResponse.json(
        { error: "Workshop ID required" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const workshops = await getWorkshops();
    const workshop = workshops.find((w) => w.id === workshopId);

    if (!workshop) {
      return NextResponse.json(
        { error: "Workshop not found" },
        { status: 404 }
      );
    }

    // Determine which pricing tier to use
    let selectedTier = workshop.pricingTiers?.[0];
    if (pricingTierId && workshop.pricingTiers) {
      const found = workshop.pricingTiers.find((t) => t.id === pricingTierId);
      if (found) selectedTier = found;
    }

    const priceId = selectedTier?.stripePriceId ?? workshop.stripePriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Registration not yet available" },
        { status: 400 }
      );
    }

    if (workshop.spotsRemaining <= 0) {
      return NextResponse.json(
        { error: "Workshop is sold out" },
        { status: 400 }
      );
    }

    const siteUrl =
      origin || "https://workshops.daydreamers-academy.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        workshopId: workshop.id,
        workshopSlug: workshop.slug,
        pricingTierId: selectedTier?.id ?? "",
        bundleSize: String(selectedTier?.bundleSize ?? 1),
        product_type: "workshop",
        source: "daydreamers-workshops",
      },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
