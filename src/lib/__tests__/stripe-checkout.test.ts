import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

beforeAll(() => {
  config({ path: resolve(__dirname, "../../../.env.local") });
});

describe("Stripe checkout integration", () => {
  it("has valid Stripe secret key", () => {
    expect(process.env.STRIPE_SECRET_KEY).toBeTruthy();
    expect(process.env.STRIPE_SECRET_KEY).toMatch(/^sk_(live|test)_/);
  });

  it("creates a checkout session for a workshop with a Stripe price ID", async () => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Use the Vibe Coding Private Workshop price ID from prod
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: "price_1TEG8RKw2PoG69dhULjh8naD",
          quantity: 1,
        },
      ],
      metadata: {
        workshopId: "24f75c3b-b93a-47ab-9727-c87b0a265f4a",
        workshopSlug: "vibe-coding-private-workshop",
        product_type: "workshop",
      },
      success_url:
        "https://workshops.daydreamers-academy.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        "https://workshops.daydreamers-academy.com/checkout/cancelled",
      allow_promotion_codes: true,
    });

    expect(session.id).toBeTruthy();
    expect(session.id).toMatch(/^cs_(live|test)_/);
    expect(session.url).toBeTruthy();
    expect(session.url).toContain("checkout.stripe.com");

    console.log(`Checkout session created: ${session.id}`);
    console.log(`Checkout URL: ${session.url}`);
  });

  it("end-to-end: fetches workshop from Supabase and creates checkout", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const Stripe = (await import("stripe")).default;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Fetch a paid workshop that has pricing tiers
    const { data: events } = await supabase
      .from("events")
      .select("event_id, event_name, slug, stripe_price_id")
      .eq("paid", true)
      .not("stripe_price_id", "is", null)
      .limit(1)
      .single();

    expect(events).toBeTruthy();
    expect(events!.stripe_price_id).toBeTruthy();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: events!.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        workshopId: events!.event_id,
        workshopSlug: events!.slug,
        product_type: "workshop",
      },
      success_url:
        "https://workshops.daydreamers-academy.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        "https://workshops.daydreamers-academy.com/checkout/cancelled",
    });

    expect(session.id).toMatch(/^cs_(live|test)_/);
    expect(session.url).toContain("checkout.stripe.com");

    console.log(
      `E2E: Created checkout for "${events!.event_name}" → ${session.url}`
    );
  });
});
