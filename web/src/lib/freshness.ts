import type { Media, Restaurant, SectionKey } from "./types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const FRESH_FOR = 3 * DAY;
export const OUTDATED_AFTER = 30 * DAY;

export type FreshLevel = "fresh" | "aging" | "outdated" | "none";

export function freshLevel(ts: number | undefined, now: number): FreshLevel {
  if (!ts) return "none";
  const age = now - ts;
  if (age < FRESH_FOR) return "fresh";
  if (age < OUTDATED_AFTER) return "aging";
  return "outdated";
}

export function timeAgo(ts: number, now: number): string {
  const mins = Math.floor(Math.max(0, now - ts) / MINUTE);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

export function freshLabel(ts: number | undefined, now: number): string {
  const level = freshLevel(ts, now);
  if (level === "none") return "Not shared yet";
  if (level === "outdated") return "Outdated";
  return `Updated ${timeAgo(ts!, now)}`;
}

export function exactStamp(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} at ${time.toUpperCase()}`;
}

/** Disposable-camera style date stamp, e.g. 27 10 '26  10:42 */
export function filmStamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())} ${p(d.getMonth() + 1)} '${String(d.getFullYear()).slice(2)}  ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function latestBySection(r: Restaurant): Partial<Record<SectionKey, Media>> {
  const out: Partial<Record<SectionKey, Media>> = {};
  for (const m of r.media) {
    const cur = out[m.section];
    if (!cur || m.capturedAt > cur.capturedAt) out[m.section] = m;
  }
  return out;
}

export function lastUpdate(r: Restaurant): number | undefined {
  return r.media.reduce<number | undefined>((max, m) => (max === undefined || m.capturedAt > max ? m.capturedAt : max), undefined);
}

const SCORE: Record<FreshLevel, number> = { fresh: 100, aging: 60, outdated: 15, none: 0 };

/** How much of the restaurant is shown, and how recently. Not a hygiene rating. */
export function transparencyScore(r: Restaurant, now: number): number {
  const latest = latestBySection(r);
  const total = r.sections.reduce((sum, key) => sum + SCORE[freshLevel(latest[key]?.capturedAt, now)], 0);
  return Math.round(total / r.sections.length);
}

export const LEVEL_STYLE: Record<FreshLevel, { dot: string; chip: string; ring: string; text: string }> = {
  fresh: { dot: "bg-fresh", chip: "bg-fresh/12 text-fresh-ink", ring: "ring-fresh", text: "text-fresh-ink" },
  aging: { dot: "bg-aging", chip: "bg-aging/15 text-aging-ink", ring: "ring-aging", text: "text-aging-ink" },
  outdated: { dot: "bg-stale", chip: "bg-stale/12 text-stale", ring: "ring-stale", text: "text-stale" },
  none: { dot: "bg-line", chip: "bg-ink/5 text-muted", ring: "ring-line", text: "text-muted" },
};
