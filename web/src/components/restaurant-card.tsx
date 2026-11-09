"use client";

import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { freshLevel, latestBySection, timeAgo, transparencyScore } from "@/lib/freshness";
import { cn, compact, isOpen } from "@/lib/format";
import type { Restaurant } from "@/lib/types";
import { FreshChip, FreshDot, Media } from "./ui";

export function RestaurantCard({ r, now, index = 0 }: { r: Restaurant; now: number; index?: number }) {
  const latest = latestBySection(r);
  const kitchen = latest.kitchen?.capturedAt;
  const food = latest.food?.capturedAt;
  const score = transparencyScore(r, now);
  const open = isOpen(r.hours, now);
  const foodToday = food && new Date(food).toDateString() === new Date(now).toDateString();

  return (
    <Link
      href={`/r/${r.slug}`}
      className="group block animate-rise"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[26px] bg-line">
        <Media src={r.cover} className="size-full transition duration-500 group-hover:scale-105" alt={r.name} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <FreshChip ts={kitchen} now={now} prefix="Kitchen" className="bg-white/95 shadow-sm backdrop-blur" />
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-display text-xs font-extrabold shadow-sm",
              score >= 75 ? "bg-lime text-ink" : score >= 40 ? "bg-white/95 text-ink" : "bg-ink text-white",
            )}
          >
            {score}% open
          </span>
        </div>
        {!open && (
          <div className="absolute inset-0 grid place-items-center bg-ink/45">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold">Closed now</span>
          </div>
        )}
      </div>

      <div className="px-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[19px] leading-tight font-bold">{r.name}</h3>
          {r.google && (
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-fresh-ink px-1.5 py-0.5 text-[13px] font-bold text-white">
              {r.google.rating.toFixed(1)} <Star className="size-3 fill-white" />
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {r.cuisines.slice(0, 2).join(", ")} · <MapPin className="inline size-3.5 -translate-y-px" /> {r.distanceKm} km ·{" "}
          <span className={open ? "font-semibold text-fresh-ink" : "font-semibold text-stale"}>{open ? "Open" : "Closed"}</span>
          {r.google && <> · {compact(r.google.count)} Google reviews</>}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
          {food && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1">
              <FreshDot ts={food} now={now} />
              {foodToday ? "Food updated today" : `Food ${timeAgo(food, now)}`}
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1",
              !r.fssai.verified && "text-muted",
            )}
          >
            <BadgeCheck className={cn("size-3.5", r.fssai.verified ? "text-fresh-ink" : "text-muted")} />
            FSSAI {r.fssai.verified ? "verified" : "pending"}
          </span>
          {freshLevel(kitchen, now) === "outdated" && (
            <span className="rounded-full bg-stale/10 px-2.5 py-1 text-stale">Kitchen not updated in 30+ days</span>
          )}
        </div>
      </div>
    </Link>
  );
}
