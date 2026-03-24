import type { MetadataRoute } from "next";
import { getWorkshops } from "@/lib/notion";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const workshops = await getWorkshops();

  const workshopUrls = workshops.map((w) => ({
    url: `https://workshops.daydreamers-academy.com/workshops/${w.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://workshops.daydreamers-academy.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...workshopUrls,
  ];
}
