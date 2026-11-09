"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { DAY, freshLevel, lastUpdate, timeAgo, transparencyScore } from "@/lib/freshness";
import { AREAS, CUISINES } from "@/lib/seed";
import { cn, isOpen } from "@/lib/format";
import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "../restaurant-card";
import { StoryViewer } from "../story-viewer";
import { Logo, Media, Sheet, Splash } from "../ui";

type Sort = "nearby" | "freshest" | "rated";

export function Home() {
  const { ready, restaurants, now, bump } = useStore();
  const [area, setArea] = useState("Secunderabad");
  const [areaOpen, setAreaOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("nearby");
  const [story, setStory] = useState<Restaurant | null>(null);

  const drops = useMemo(
    () =>
      restaurants
        .filter((r) => r.media.length)
        .sort((a, b) => (lastUpdate(b) ?? 0) - (lastUpdate(a) ?? 0))
        .slice(0, 10),
    [restaurants],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = restaurants.filter((r) => {
      if (q && ![r.name, r.area, ...r.cuisines].some((s) => s.toLowerCase().includes(q))) return false;
      if (cuisine && !r.cuisines.includes(cuisine)) return false;
      if (openNow && !isOpen(r.hours, now)) return false;
      if (freshOnly && now - (lastUpdate(r) ?? 0) > 7 * DAY) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "freshest") return (lastUpdate(b) ?? 0) - (lastUpdate(a) ?? 0);
      if (sort === "rated") return (b.google?.rating ?? 0) - (a.google?.rating ?? 0);
      const areaBias = Number(b.area === area) - Number(a.area === area);
      return areaBias || a.distanceKm - b.distanceKm;
    });
  }, [restaurants, query, cuisine, openNow, freshOnly, sort, area, now]);

  if (!ready) return <Splash />;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-paper/85 px-5 py-3 backdrop-blur-xl">
        <Logo />
        <button
          onClick={() => setAreaOpen(true)}
          className="flex items-center gap-1 rounded-full border border-line bg-card py-1.5 pr-2.5 pl-2 text-sm font-semibold"
        >
          <MapPin className="size-4 text-grape" /> {area}
          <ChevronDown className="size-4 text-muted" />
        </button>
      </header>

      <section className="px-5 pt-4">
        <h1 className="font-display text-[40px] leading-[0.95] font-extrabold tracking-tight">
          See what&apos;s cooking.
          <br />
          <span className="relative inline-block">
            <span className="relative z-10">Literally.</span>
            <span className="absolute inset-x-0 bottom-1 -z-0 h-3.5 -rotate-1 rounded bg-lime" />
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-muted">Real kitchens. Real time stamps. Zero filters.</p>

        <label className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.02)] focus-within:border-ink focus-within:ring-4 focus-within:ring-lime/50">
          <Search className="size-5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Biryani, dosa, Jubilee Hills…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
          />
        </label>
      </section>

      <section className="mt-7">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="font-display text-lg font-bold">Fresh drops 🔥</h2>
          <span className="text-xs text-muted">Tap to peek inside</span>
        </div>
        <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-5 pb-1">
          {drops.map((r) => {
            const ts = lastUpdate(r);
            const level = freshLevel(ts, now);
            return (
              <button
                key={r.id}
                onClick={() => {
                  setStory(r);
                  bump(r.id, "kitchenViews");
                }}
                className="flex w-[74px] shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "rounded-full p-[3px]",
                    level === "fresh" && "bg-gradient-to-tr from-fresh via-lime to-fresh",
                    level === "aging" && "bg-aging",
                    level === "outdated" && "bg-stale",
                  )}
                >
                  <span className="block rounded-full bg-paper p-[2px]">
                    <Media src={r.cover} className="size-[62px] rounded-full" />
                  </span>
                </span>
                <span className="w-full truncate text-center text-[11px] leading-tight font-semibold">{r.name}</span>
                <span className="-mt-1 text-[10px] text-muted">{ts ? timeAgo(ts, now).replace(" ago", "") : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5">
          <Chip active={!cuisine} onClick={() => setCuisine(null)}>
            All
          </Chip>
          {CUISINES.map((c) => (
            <Chip key={c} active={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 px-5">
          <SlidersHorizontal className="size-4 text-muted" />
          <Toggle on={openNow} onClick={() => setOpenNow(!openNow)}>
            Open now
          </Toggle>
          <Toggle on={freshOnly} onClick={() => setFreshOnly(!freshOnly)}>
            Updated this week
          </Toggle>
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="mb-4 flex rounded-full bg-ink/5 p-1 text-sm font-semibold">
          {(
            [
              ["nearby", "Nearby"],
              ["freshest", "Freshest"],
              ["rated", "Top rated"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn("flex-1 rounded-full py-2 transition", sort === key ? "bg-card shadow-sm" : "text-muted")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-7">
          {list.map((r, i) => (
            <RestaurantCard key={r.id} r={r} now={now} index={i} />
          ))}
          {list.length === 0 && (
            <div className="rounded-3xl border border-dashed border-line p-10 text-center">
              <p className="text-3xl">🫥</p>
              <p className="mt-2 font-semibold">Nothing here yet</p>
              <p className="text-sm text-muted">Try another search or clear filters.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 px-5">
        <Link href="/business" className="group block overflow-hidden rounded-[28px] bg-ink p-6 text-white">
          <p className="text-xs font-bold tracking-widest text-lime uppercase">For restaurants</p>
          <p className="mt-2 font-display text-2xl leading-tight font-bold">Got a clean kitchen? Flex it.</p>
          <p className="mt-1 text-sm text-white/60">Show customers what&apos;s inside. Free to start.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink transition group-hover:gap-2.5">
            List your restaurant <ArrowRight className="size-4" />
          </span>
        </Link>
        <p className="mt-6 text-center text-xs text-muted">
          Avg transparency nearby: {Math.round(restaurants.reduce((s, r) => s + transparencyScore(r, now), 0) / restaurants.length)}%
        </p>
      </section>

      <Sheet open={areaOpen} onClose={() => setAreaOpen(false)} title="Where are you?">
        <div className="grid grid-cols-2 gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setArea(a);
                setAreaOpen(false);
              }}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                a === area ? "border-ink bg-lime" : "border-line hover:bg-paper",
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted">Hyderabad only for now. More cities soon 👀</p>
      </Sheet>

      {story && (
        <StoryViewer
          restaurant={story}
          items={[...story.media].sort((a, b) => b.capturedAt - a.capturedAt)}
          now={now}
          onClose={() => setStory(null)}
        />
      )}
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active ? "border-ink bg-ink text-white" : "border-line bg-card hover:border-ink/30",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-bold transition",
        on ? "bg-lime text-ink" : "bg-ink/5 text-muted hover:bg-ink/10",
      )}
    >
      {on && "✓ "}
      {children}
    </button>
  );
}
