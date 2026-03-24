import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local for real DB credentials
beforeAll(() => {
  config({ path: resolve(__dirname, "../../../.env.local") });
});

describe("Supabase data extraction", () => {
  it("connects to Supabase and fetches paid events", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: events, error } = await supabase
      .from("events")
      .select("event_id, event_name, paid, price, stripe_price_id, slug")
      .eq("paid", true);

    expect(error).toBeNull();
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events!.length).toBeGreaterThan(0);

    // Every paid event should have a name
    for (const event of events!) {
      expect(event.event_name).toBeTruthy();
      expect(event.paid).toBe(true);
    }

    console.log(
      `Found ${events!.length} paid event(s):`,
      events!.map((e) => e.event_name)
    );
  });

  it("fetches pricing tiers for paid events", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get paid events first
    const { data: events } = await supabase
      .from("events")
      .select("event_id")
      .eq("paid", true);

    expect(events).toBeDefined();
    expect(events!.length).toBeGreaterThan(0);

    const eventIds = events!.map((e) => e.event_id);

    const { data: tiers, error } = await supabase
      .from("pricing_tiers")
      .select("*")
      .in("event_id", eventIds)
      .eq("is_active", true);

    expect(error).toBeNull();
    expect(tiers).toBeDefined();
    expect(tiers!.length).toBeGreaterThan(0);

    // Every tier should have a Stripe price ID and a price
    for (const tier of tiers!) {
      expect(tier.stripe_price_id).toBeTruthy();
      expect(tier.price).toBeGreaterThan(0);
      expect(tier.name).toBeTruthy();
      expect(tier.is_active).toBe(true);
    }

    console.log(
      `Found ${tiers!.length} pricing tier(s):`,
      tiers!.map((t) => `${t.name} - $${(t.price / 100).toFixed(0)}`)
    );
  });

  it("maps events to Workshop type correctly", async () => {
    // Dynamically import to get env vars loaded
    const { getWorkshopsFromSupabase } = await import("../supabase-data");

    const workshops = await getWorkshopsFromSupabase();

    expect(workshops.length).toBeGreaterThan(0);

    for (const workshop of workshops) {
      // Required fields
      expect(workshop.id).toBeTruthy();
      expect(workshop.title).toBeTruthy();
      expect(workshop.slug).toBeTruthy();
      expect(workshop.price).toBeGreaterThan(0);
      expect(workshop.stripePriceId).toBeTruthy();
      expect(["Published", "Sold Out"]).toContain(workshop.status);

      // Pricing tiers should be attached
      expect(workshop.pricingTiers).toBeDefined();
      expect(workshop.pricingTiers!.length).toBeGreaterThan(0);

      for (const tier of workshop.pricingTiers!) {
        expect(tier.stripePriceId).toBeTruthy();
        expect(tier.price).toBeGreaterThan(0);
      }

      console.log(
        `Workshop: "${workshop.title}" - $${(workshop.price / 100).toFixed(0)} (${workshop.pricingTiers!.length} tiers, stripe: ${workshop.stripePriceId})`
      );
    }
  });

  it("verifies Stripe price IDs are valid format", async () => {
    const { getWorkshopsFromSupabase } = await import("../supabase-data");

    const workshops = await getWorkshopsFromSupabase();

    for (const workshop of workshops) {
      // Stripe price IDs should start with "price_"
      expect(workshop.stripePriceId).toMatch(/^price_/);

      for (const tier of workshop.pricingTiers ?? []) {
        expect(tier.stripePriceId).toMatch(/^price_/);
      }
    }
  });

  it("getWorkshopBySlug returns correct workshop", async () => {
    const { getWorkshopsFromSupabase, getWorkshopBySlugFromSupabase } =
      await import("../supabase-data");

    const workshops = await getWorkshopsFromSupabase();
    expect(workshops.length).toBeGreaterThan(0);

    const first = workshops[0];
    const found = await getWorkshopBySlugFromSupabase(first.slug);

    expect(found).toBeDefined();
    expect(found!.id).toBe(first.id);
    expect(found!.title).toBe(first.title);
  });
});
