import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getWorkshops } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const { workshopId } = await req.json();

    if (!workshopId) {
      return NextResponse.json(
        { error: "Workshop ID required" },
        { status: 400 }
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

    if (!workshop.stripePriceId) {
      return NextResponse.json(
        { error: "Registration not yet available" },
        { status: 400 }
      );
    }

    if (workshop.spotsRemaining <= 0) {
      return NextResponse.json({ error: "Workshop is sold out" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: workshop.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        workshopId: workshop.id,
        workshopSlug: workshop.slug,
      },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancelled`,
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
