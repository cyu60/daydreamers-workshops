import { createClient } from "@supabase/supabase-js";
import type { Workshop, Instructor } from "./types";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getWorkshopsFromSupabase(): Promise<Workshop[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Fetch paid events with their pricing tiers
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("paid", true)
    .order("event_date", { ascending: true });

  if (error || !events) {
    console.error("Failed to fetch paid events:", error);
    return [];
  }

  // Fetch pricing tiers for all paid events
  const eventIds = events.map((e) => e.event_id);
  const { data: tiers } = await supabase
    .from("pricing_tiers")
    .select("*")
    .in("event_id", eventIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const tiersByEvent = new Map<string, any[]>();
  for (const tier of tiers ?? []) {
    const existing = tiersByEvent.get(tier.event_id) ?? [];
    existing.push(tier);
    tiersByEvent.set(tier.event_id, existing);
  }

  return events.map((event) => {
    const eventTiers = tiersByEvent.get(event.event_id) ?? [];
    // Use the cheapest active tier as the display price
    const cheapestTier = eventTiers.length > 0
      ? eventTiers.reduce((min, t) => (t.price < min.price ? t : min), eventTiers[0])
      : null;

    // Calculate total spots and remaining from tiers
    const totalCapacity = event.participant_capacity ?? 0;
    const totalSold = eventTiers.reduce(
      (sum, t) => sum + (t.current_quantity ?? 0),
      0
    );

    return {
      id: event.event_id,
      slug: event.slug || event.event_id,
      title: event.event_name,
      description: event.event_blurb || event.event_description || "",
      fullDescription: event.event_description || event.event_blurb || "",
      instructorIds: event.owner_id ? [event.owner_id] : [],
      date: event.event_date,
      duration: "",
      price: cheapestTier?.price ?? event.price ?? 0,
      capacity: totalCapacity,
      spotsRemaining: Math.max(0, totalCapacity - totalSold),
      coverImage: event.cover_image_url,
      tags: event.event_type ? [event.event_type] : [],
      status: totalCapacity > 0 && totalSold >= totalCapacity
        ? ("Sold Out" as const)
        : ("Published" as const),
      stripePriceId: cheapestTier?.stripe_price_id ?? event.stripe_price_id ?? "",
      // Extra: all pricing tiers for the detail page
      pricingTiers: eventTiers.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        stripePriceId: t.stripe_price_id,
        description: t.description,
        maxQuantity: t.max_quantity,
        currentQuantity: t.current_quantity,
        isActive: t.is_active,
        bundleSize: t.bundle_size,
      })),
    };
  });
}

export async function getWorkshopBySlugFromSupabase(
  slug: string
): Promise<Workshop | null> {
  const workshops = await getWorkshopsFromSupabase();
  return workshops.find((w) => w.slug === slug) ?? null;
}
