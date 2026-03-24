import { createClient } from "@supabase/supabase-js";
import type { Workshop, Instructor } from "./types";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ─── Workshops (from Supabase events table) ───────────────────────────

export async function getWorkshops(): Promise<Workshop[]> {
  const supabase = getSupabase();
  if (!supabase) return getMockWorkshops();

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("paid", true)
    .order("event_date", { ascending: true });

  if (error || !events || events.length === 0) {
    console.error("Failed to fetch paid events:", error);
    return getMockWorkshops();
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

  return events.map((event) => mapEventToWorkshop(event, tiersByEvent));
}

export async function getWorkshopBySlug(
  slug: string
): Promise<Workshop | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const mocks = getMockWorkshops();
    return mocks.find((w) => w.slug === slug) ?? null;
  }

  // Try slug first, then event_id
  let { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("paid", true)
    .maybeSingle();

  if (!event) {
    ({ data: event } = await supabase
      .from("events")
      .select("*")
      .eq("event_id", slug)
      .eq("paid", true)
      .maybeSingle());
  }

  if (!event) return null;

  const { data: tiers } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("event_id", event.event_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const tiersByEvent = new Map<string, any[]>();
  tiersByEvent.set(event.event_id, tiers ?? []);

  return mapEventToWorkshop(event, tiersByEvent);
}

function mapEventToWorkshop(
  event: any,
  tiersByEvent: Map<string, any[]>
): Workshop {
  const eventTiers = tiersByEvent.get(event.event_id) ?? [];

  // Use the cheapest active tier as the display price
  const cheapestTier =
    eventTiers.length > 0
      ? eventTiers.reduce(
          (min, t) => (t.price < min.price ? t : min),
          eventTiers[0]
        )
      : null;

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
    spotsRemaining:
      totalCapacity > 0 ? Math.max(0, totalCapacity - totalSold) : 999,
    coverImage: event.cover_image_url,
    tags: event.event_type ? [event.event_type] : [],
    status:
      totalCapacity > 0 && totalSold >= totalCapacity
        ? ("Sold Out" as const)
        : ("Published" as const),
    stripePriceId:
      cheapestTier?.stripe_price_id ?? event.stripe_price_id ?? "",
    pricingTiers: eventTiers.map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      stripePriceId: t.stripe_price_id,
      description: t.description,
      maxQuantity: t.max_quantity,
      currentQuantity: t.current_quantity ?? 0,
      isActive: t.is_active,
      bundleSize: t.bundle_size ?? 1,
    })),
  };
}

// ─── Instructors (mock for now — no people table in Supabase yet) ─────

export async function getInstructors(): Promise<Instructor[]> {
  return getMockInstructors();
}

export async function getInstructorBySlug(
  slug: string
): Promise<Instructor | null> {
  const instructors = await getInstructors();
  return instructors.find((i) => i.slug === slug) ?? null;
}

export async function getInstructorsByIds(
  ids: string[]
): Promise<Instructor[]> {
  const all = await getInstructors();
  return all.filter((i) => ids.includes(i.id));
}

// ─── Mock data (fallback when Supabase has no paid events) ────────────

function getMockWorkshops(): Workshop[] {
  return [
    {
      id: "1",
      slug: "intro-to-ai-agents",
      title: "Intro to AI Agents",
      description:
        "Learn to build your first AI agent from scratch. No prior AI experience needed — just bring your laptop and curiosity.",
      fullDescription:
        "In this hands-on workshop, you'll go from zero to a working AI agent in under 2 hours. We'll cover the fundamentals of LLMs, prompt engineering, tool use, and agent loops. By the end, you'll have built and deployed your own agent that can browse the web, answer questions, and take actions on your behalf.\n\nPerfect for developers, founders, and anyone curious about what AI agents can actually do.",
      instructorIds: ["1"],
      date: "2026-04-12T10:00:00",
      duration: "2 hours",
      price: 4900,
      capacity: 30,
      spotsRemaining: 12,
      coverImage: null,
      tags: ["AI", "Beginner"],
      status: "Published",
      stripePriceId: "",
    },
    {
      id: "2",
      slug: "no-code-ai-automation",
      title: "No-Code AI Automation",
      description:
        "Automate your workflows with AI — no coding required. Build real automations with Make, Zapier, and GPT.",
      fullDescription:
        "Stop doing repetitive tasks manually. In this workshop, you'll learn how to connect AI models to your existing tools and create powerful automations without writing a single line of code.\n\nWe'll build 3 real automations together: an AI email responder, a content pipeline, and a lead qualification system. You'll leave with templates you can customize for your own business.",
      instructorIds: ["2"],
      date: "2026-04-19T14:00:00",
      duration: "3 hours",
      price: 7900,
      capacity: 25,
      spotsRemaining: 8,
      coverImage: null,
      tags: ["AI", "No-Code", "Automation"],
      status: "Published",
      stripePriceId: "",
    },
    {
      id: "3",
      slug: "design-with-ai",
      title: "Design with AI",
      description:
        "Use AI tools to supercharge your design process — from ideation to polished assets in record time.",
      fullDescription:
        "AI is transforming how designers work. In this workshop, you'll learn to use Midjourney, DALL-E, Figma AI, and other tools to accelerate every stage of the design process.\n\nWe'll cover: AI-assisted moodboarding, rapid prototyping with generated assets, and how to maintain brand consistency when using AI. Bring a project you're working on — you'll apply everything in real time.",
      instructorIds: ["1", "2"],
      date: "2026-04-26T10:00:00",
      duration: "2.5 hours",
      price: 5900,
      capacity: 20,
      spotsRemaining: 0,
      coverImage: null,
      tags: ["Design", "AI", "Creative"],
      status: "Sold Out",
      stripePriceId: "",
    },
    {
      id: "4",
      slug: "build-ship-saas",
      title: "Build & Ship a SaaS in a Weekend",
      description:
        "From idea to deployed product in one intensive session. Learn the modern stack for shipping fast.",
      fullDescription:
        "The best way to learn is to build. In this intensive workshop, you'll go from a blank repo to a live, deployed SaaS product with authentication, payments, and a database.\n\nStack: Next.js, Supabase, Stripe, Vercel. We'll move fast, pair program, and help each other debug. By the end of the day, you'll have a real product live on the internet.",
      instructorIds: ["3"],
      date: "2026-05-03T09:00:00",
      duration: "6 hours",
      price: 12900,
      capacity: 15,
      spotsRemaining: 15,
      coverImage: null,
      tags: ["Engineering", "SaaS", "Full-Stack"],
      status: "Published",
      stripePriceId: "",
    },
  ];
}

function getMockInstructors(): Instructor[] {
  return [
    {
      id: "1",
      slug: "alex-chen",
      name: "Alex Chen",
      role: "AI Workshop Lead",
      bio: "Alex is a machine learning engineer turned educator. Previously at Google Brain, now focused on making AI accessible to everyone. Has taught 500+ students across 20 workshops.",
      photo: null,
      linkedin: "https://linkedin.com/in/example",
    },
    {
      id: "2",
      slug: "maya-patel",
      name: "Maya Patel",
      role: "Automation & No-Code Specialist",
      bio: "Maya helps businesses automate everything. Former ops lead at a YC startup, she's built automations that saved her team 40+ hours per week. Believes everyone should be able to harness AI, regardless of technical background.",
      photo: null,
      linkedin: "https://linkedin.com/in/example",
    },
    {
      id: "3",
      slug: "jordan-kim",
      name: "Jordan Kim",
      role: "Full-Stack Engineer & Mentor",
      bio: "Jordan has shipped 12 products in 3 years. He believes in learning by doing and has mentored dozens of first-time founders through their first launches. Currently building developer tools at a stealth startup.",
      photo: null,
      linkedin: "https://linkedin.com/in/example",
    },
  ];
}
