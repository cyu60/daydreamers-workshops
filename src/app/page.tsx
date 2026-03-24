import { Suspense } from "react";
import { getWorkshops, getInstructors } from "@/lib/notion";
import { WorkshopCard } from "@/components/workshop-card";
import { TagFilter } from "@/components/tag-filter";

export const revalidate = 60;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const [workshops, instructors] = await Promise.all([
    getWorkshops(),
    getInstructors(),
  ]);

  const allTags = [...new Set(workshops.flatMap((w) => w.tags))].sort();

  const filtered = params.tag
    ? workshops.filter((w) => w.tags.includes(params.tag!))
    : workshops;

  const instructorMap = new Map(instructors.map((i) => [i.id, i]));

  return (
    <div className="max-w-[1180px] mx-auto px-8 py-16">
      {/* Hero */}
      <section className="text-center mb-16 fade-up">
        <div className="inline-flex items-center gap-2 bg-cobalt-soft text-cobalt text-xs font-bold tracking-[0.16em] uppercase px-4 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
          Live Workshops
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,5vw,3.8rem)] text-ink leading-tight mb-5">
          Learn by doing.
        </h1>
        <p className="text-lg text-dust max-w-xl mx-auto leading-relaxed">
          Hands-on workshops in AI, automation, design, and engineering.
          Small groups, expert instructors, real projects.
        </p>
      </section>

      {/* Filters */}
      <section className="mb-10 fade-up fade-up-d1">
        <Suspense>
          <TagFilter tags={allTags} />
        </Suspense>
      </section>

      {/* Workshop Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((workshop, i) => (
          <div
            key={workshop.id}
            className={`fade-up ${
              i % 4 === 0
                ? ""
                : i % 4 === 1
                  ? "fade-up-d1"
                  : i % 4 === 2
                    ? "fade-up-d2"
                    : "fade-up-d3"
            }`}
          >
            <WorkshopCard
              workshop={workshop}
              instructors={workshop.instructorIds
                .map((id) => instructorMap.get(id))
                .filter(Boolean) as any}
            />
          </div>
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dust text-lg">
            No workshops found for this filter.
          </p>
        </div>
      )}
    </div>
  );
}
