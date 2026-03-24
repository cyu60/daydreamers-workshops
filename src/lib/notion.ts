import { Client } from "@notionhq/client";
import type { Workshop, Instructor } from "./types";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const WORKSHOPS_DB = process.env.NOTION_WORKSHOPS_DB_ID!;
const PEOPLE_DB = process.env.NOTION_PEOPLE_DB_ID!;

function richTextToPlain(richText: any[]): string {
  return richText?.map((t: any) => t.plain_text).join("") ?? "";
}

function getFileUrl(files: any): string | null {
  if (!files || files.length === 0) return null;
  const file = files[0];
  return file?.file?.url ?? file?.external?.url ?? null;
}

export async function getWorkshops(): Promise<Workshop[]> {
  if (!process.env.NOTION_API_KEY || !WORKSHOPS_DB) return getMockWorkshops();

  const res = await notion.dataSources.query({
    data_source_id: WORKSHOPS_DB,
    filter: {
      property: "Status",
      select: { does_not_equal: "Draft" },
    },
    sorts: [{ property: "Date", direction: "ascending" }],
  });

  return res.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      slug: richTextToPlain(p["Slug"]?.rich_text) || page.id,
      title: richTextToPlain(p["Name"]?.title),
      description: richTextToPlain(p["Description"]?.rich_text),
      fullDescription: richTextToPlain(p["Full Description"]?.rich_text),
      instructorIds: p["Instructor"]?.relation?.map((r: any) => r.id) ?? [],
      date: p["Date"]?.date?.start ?? null,
      duration: richTextToPlain(p["Duration"]?.rich_text),
      price: p["Price"]?.number ?? 0,
      capacity: p["Capacity"]?.number ?? 0,
      spotsRemaining: p["Spots Remaining"]?.number ?? 0,
      coverImage: getFileUrl(p["Cover Image"]?.files),
      tags: p["Tags"]?.multi_select?.map((t: any) => t.name) ?? [],
      status: p["Status"]?.select?.name ?? "Published",
      stripePriceId: richTextToPlain(p["Stripe Price ID"]?.rich_text),
    };
  });
}

export async function getWorkshopBySlug(
  slug: string
): Promise<Workshop | null> {
  const workshops = await getWorkshops();
  return workshops.find((w) => w.slug === slug) ?? null;
}

export async function getInstructors(): Promise<Instructor[]> {
  if (!process.env.NOTION_API_KEY || !PEOPLE_DB) return getMockInstructors();

  const res = await notion.dataSources.query({
    data_source_id: PEOPLE_DB,
  });

  return res.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      slug: richTextToPlain(p["Slug"]?.rich_text) || page.id,
      name: richTextToPlain(p["Name"]?.title),
      role: richTextToPlain(p["Role"]?.rich_text),
      bio: richTextToPlain(p["Bio"]?.rich_text),
      photo: getFileUrl(p["Photo"]?.files),
      linkedin: p["LinkedIn"]?.url ?? null,
    };
  });
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

// Mock data for development without Notion
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
