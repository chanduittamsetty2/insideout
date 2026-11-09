"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Flag,
  MapPin,
  Navigation,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { exactStamp, freshLevel, lastUpdate, latestBySection, timeAgo, transparencyScore } from "@/lib/freshness";
import { SECTIONS } from "@/lib/sections";
import { cn, compact, isOpen, num, prettyTime, rupees } from "@/lib/format";
import type { Media as MediaT, Restaurant, SectionKey } from "@/lib/types";
import { StoryViewer } from "../story-viewer";
import { FreshChip, Logo, Media, ScoreRing, Sheet, Splash } from "../ui";

export function Profile({ slug }: { slug: string }) {
  const { ready, bySlug, now, track } = useStore();
  const r = bySlug(slug);
  const [story, setStory] = useState<MediaT[] | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!r || tracked.current) return;
    tracked.current = true;
    if (r.status !== "live") return;
    const src = new URLSearchParams(window.location.search).get("src");
    track(r.id, "profile_view", src && QR_SOURCES.includes(src) ? src : undefined);
    if (src) track(r.id, "qr_scan", QR_SOURCES.includes(src) ? src : "table");
  }, [r, track]);

  if (!ready) return <Splash />;
  if (!r) return <NotFound />;

  const latest = latestBySection(r);
  const score = transparencyScore(r, now);
  const open = isOpen(r.hours, now);
  const updated = lastUpdate(r);
  const shown = r.sections.filter((k) => latest[k]).length;
  const sections = SECTIONS.filter((s) => r.sections.includes(s.key));

  const openSection = (key?: SectionKey) => {
    const items = r.media.filter((m) => !key || m.section === key).sort((a, b) => b.capturedAt - a.capturedAt);
    if (!items.length) return;
    setStory(items);
    if (r.status === "live") track(r.id, "kitchen_view");
  };

  const share = async () => {
    const url = window.location.href.split("?")[0];
    if (navigator.share) return navigator.share({ title: r.name, text: `Peek inside ${r.name} on InsideOut 👀`, url }).catch(() => {});
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-32">
      {r.status !== "live" && (
        <div className="bg-aging px-4 py-2 text-center text-xs font-bold text-ink">
          {r.status === "draft" ? "Preview · not published yet. Only you can see this." : "This profile is suspended by InsideOut."}
        </div>
      )}
      <section className="relative h-[360px] overflow-hidden">
        <Media src={r.cover} className="absolute inset-0 size-full" alt={r.name} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/80" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link href="/" aria-label="Back" className="grid size-10 place-items-center rounded-full bg-white/90 backdrop-blur">
            <ArrowLeft className="size-5" />
          </Link>
          <Logo invert className="text-lg drop-shadow" />
          <button onClick={share} aria-label="Share" className="grid size-10 place-items-center rounded-full bg-white/90 backdrop-blur">
            <Share2 className="size-[18px]" />
          </button>
        </div>
        {copied && (
          <span className="absolute top-16 left-1/2 -translate-x-1/2 animate-pop rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
            Link copied ✨
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 pb-10 text-white">
          <div className="flex flex-wrap gap-1.5">
            {r.cuisines.map((c) => (
              <span key={c} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md">
                {c}
              </span>
            ))}
            {r.isVeg && <span className="rounded-full bg-fresh px-2.5 py-1 text-[11px] font-bold">Pure veg</span>}
          </div>
          <h1 className="mt-2.5 font-display text-[38px] leading-[0.95] font-extrabold tracking-tight">{r.name}</h1>
          <p className="mt-1.5 text-[15px] text-white/80">{r.tagline}</p>
        </div>
      </section>

      <div className="relative -mt-6 rounded-t-[32px] bg-paper px-5 pt-5">
        <div className="grid grid-cols-3 gap-2">
          <Fact
            top={
              r.google ? (
                <>
                  {r.google.rating.toFixed(1)} <Star className="size-4 fill-ink" />
                </>
              ) : (
                "New"
              )
            }
            bottom={r.google ? `${compact(r.google.count)} on Google` : "No rating yet"}
          />
          <Fact
            top={
              <>
                <MapPin className="size-4" /> {r.distanceKm} km
              </>
            }
            bottom={r.area}
          />
          <Fact
            top={<span className={open ? "text-fresh-ink" : "text-stale"}>{open ? "Open" : "Closed"}</span>}
            bottom={open ? `till ${prettyTime(r.hours.close)}` : `opens ${prettyTime(r.hours.open)}`}
          />
        </div>

        <button
          onClick={() => openSection()}
          className="mt-4 flex w-full items-center gap-4 rounded-[26px] border border-line bg-card p-4 text-left transition active:scale-[0.99]"
        >
          <ScoreRing score={score} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-bold">Transparency score</p>
            <p className="mt-0.5 text-[13px] text-muted">
              Shows {shown} of {r.sections.length} areas{updated ? ` · last update ${timeAgo(updated, now)}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted/80">How much they show, and how recently. Not a hygiene rating.</p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted" />
        </button>

        <SectionTitle eyebrow="No filters. Just facts." title="Inside the restaurant" />
        <div className="grid grid-cols-2 gap-2.5">
          {sections.map((s, i) => {
            const m = latest[s.key];
            const level = freshLevel(m?.capturedAt, now);
            const count = r.media.filter((x) => x.section === s.key).length;
            const wide = i === 0 || (i === sections.length - 1 && (sections.length - 1) % 2 === 1);
            if (!m) {
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex aspect-square flex-col justify-between rounded-[22px] border-2 border-dashed border-line p-3.5",
                    wide && "col-span-2 aspect-[2/1]",
                  )}
                >
                  <span className="text-2xl opacity-50">{s.emoji}</span>
                  <div>
                    <p className="font-display font-bold text-muted">{s.label}</p>
                    <p className="text-xs text-muted">Not shared yet</p>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={s.key}
                onClick={() => openSection(s.key)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-[22px] bg-line text-left",
                  wide && "col-span-2 aspect-[2/1]",
                )}
              >
                <Media
                  src={m.src}
                  kind={m.kind}
                  className={cn("absolute inset-0 size-full transition duration-500 group-hover:scale-105", level === "outdated" && "grayscale")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {m.kind === "video" && (
                  <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    ▶ VIDEO
                  </span>
                )}
                {count > 1 && (
                  <span className="absolute top-3 left-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {count} drops
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="font-display text-[17px] leading-tight font-bold">
                    {s.emoji} {s.label}
                  </p>
                  <FreshChip ts={m.capturedAt} now={now} className="mt-1.5 bg-white/95" />
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Camera className="size-3.5" /> All drops are captured live in the InsideOut app and auto time-stamped.
        </p>

        {r.special && (
          <>
            <SectionTitle eyebrow="Fresh off the stove" title="Today's special" />
            <div className="flex overflow-hidden rounded-[26px] bg-ink text-white">
              <Media src={r.special.image} className="w-[42%] shrink-0" alt={r.special.name} />
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-ink uppercase">
                    Today
                  </span>
                  <p className="mt-2 font-display text-xl leading-tight font-bold">{r.special.name}</p>
                  {r.special.note && <p className="mt-1 text-xs text-white/60">{r.special.note}</p>}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="font-display text-2xl font-extrabold text-lime">{rupees(r.special.price)}</p>
                  <p className="text-[10px] text-white/50">posted {timeAgo(r.special.postedAt, now)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {r.posts.length > 0 && (
          <>
            <SectionTitle eyebrow="Don't miss" title="Offers & events" />
            <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
              {r.posts.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "w-60 shrink-0 rounded-[22px] p-4",
                    p.kind === "offer" ? "bg-lime text-ink" : "bg-grape text-white",
                  )}
                >
                  <p className="text-[10px] font-extrabold tracking-widest uppercase opacity-70">{p.kind === "offer" ? "🎁 Offer" : "🎉 Event"}</p>
                  <p className="mt-1.5 font-display text-lg leading-tight font-bold">{p.title}</p>
                  {p.detail && <p className="mt-1 text-xs opacity-75">{p.detail}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          {r.google && <ActionLink href={r.google.mapsUrl} icon={<Navigation className="size-4" />} label="Directions" />}
          {r.phone && <ActionLink href={`tel:${r.phone.replace(/\s/g, "")}`} icon={<Phone className="size-4" />} label="Call" />}
          {r.links.swiggy && <ActionLink href={r.links.swiggy} icon={<span className="text-sm">🛵</span>} label="Order on Swiggy" />}
          {r.links.zomato && <ActionLink href={r.links.zomato} icon={<span className="text-sm">🍽️</span>} label="Order on Zomato" />}
        </div>

        <SectionTitle eyebrow="Receipts, not promises" title="Why you can trust this" />
        <div className="divide-y divide-line overflow-hidden rounded-[26px] border border-line bg-card">
          {r.fssai ? (
            <TrustRow
              icon={<BadgeCheck className={cn("size-5", r.fssai.verified ? "text-fresh-ink" : "text-muted")} />}
              title={`FSSAI ${r.fssai.type}`}
              badge={r.fssai.verified ? { text: "Verified", cls: "bg-fresh/12 text-fresh-ink" } : { text: "Pending", cls: "bg-aging/15 text-aging-ink" }}
            >
              Lic. no. <span className="font-mono">{r.fssai.number}</span>
              {r.fssai.validTill &&
                ` · valid till ${new Date(r.fssai.validTill).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
            </TrustRow>
          ) : (
            <TrustRow
              icon={<BadgeCheck className="size-5 text-muted" />}
              title="FSSAI license"
              badge={{ text: "Not added", cls: "bg-stale/12 text-stale" }}
            >
              This restaurant hasn&apos;t shared its FSSAI license yet.
            </TrustRow>
          )}
          <TrustRow icon={<Clock className="size-5 text-grape" />} title="Live capture, auto time-stamped">
            Photos & videos are shot inside the app. Upload times are recorded by InsideOut. Restaurants can&apos;t edit them.
          </TrustRow>
          <TrustRow icon={<Store className="size-5 text-ink" />} title="Restaurant-provided content">
            Shared by {r.name}. It shows what they choose to show. It&apos;s not an official inspection.
          </TrustRow>
          <TrustRow
            icon={<ShieldCheck className="size-5 text-muted" />}
            title="InsideOut verified visits"
            badge={{ text: "Coming soon", cls: "bg-ink/5 text-muted" }}
          >
            Surprise visits by the InsideOut team to confirm what you see.
          </TrustRow>
        </div>

        <SectionTitle eyebrow="The people have spoken" title="Reviews" />
        {r.google && (
          <a
            href={r.google.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-[26px] border border-line bg-card p-4"
          >
            <div className="font-display text-4xl font-extrabold">{r.google.rating.toFixed(1)}</div>
            <div className="flex-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn("size-4", n <= Math.round(r.google!.rating) ? "fill-aging text-aging" : "text-line")}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {num(r.google.count)} reviews on <GoogleWord />
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold">
              Read <ExternalLink className="size-3.5" />
            </span>
          </a>
        )}
        <div className="mt-2.5 space-y-2.5">
          {r.reviews.map((rv) => (
            <div key={rv.id} className="rounded-[22px] bg-card p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-lime font-display text-sm font-bold">{rv.author[0]}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{rv.author}</p>
                  <p className="text-[11px] text-muted">
                    {"★".repeat(rv.rating)}
                    <span className="text-line">{"★".repeat(5 - rv.rating)}</span> · {timeAgo(rv.at, now)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{rv.text}</p>
            </div>
          ))}
          {r.reviews.length === 0 && <p className="py-2 text-center text-sm text-muted">No InsideOut reviews yet.</p>}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
          <span>{updated ? `Last drop: ${exactStamp(updated)}` : "No drops yet"}</span>
          <button onClick={() => setReportOpen(true)} className="flex items-center gap-1 font-semibold">
            <Flag className="size-3.5" /> Report
          </button>
        </div>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md p-4">
        <div className="flex gap-2 rounded-full bg-ink/90 p-1.5 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => openSection()}
            disabled={!r.media.length}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-lime py-3 font-bold text-ink disabled:opacity-40"
          >
            <Eye className="size-5" /> Peek inside
          </button>
          {r.google && (
            <a
              href={r.google.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="grid size-12 place-items-center rounded-full bg-white/10 text-white"
              aria-label="Directions"
            >
              <Navigation className="size-5" />
            </a>
          )}
        </div>
      </div>

      {story && <StoryViewer restaurant={r} items={story} now={now} onClose={() => setStory(null)} />}

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} restaurant={r} />
    </main>
  );
}

const QR_SOURCES = ["table", "counter", "menu", "receipt", "entrance", "search", "share"];

function ReportSheet({ open, onClose, restaurant }: { open: boolean; onClose: () => void; restaurant: Restaurant }) {
  const [sent, setSent] = useState(false);
  const send = (reason: string) => {
    setSent(true);
    supabase
      .from("reports")
      .insert({ restaurant_id: restaurant.id, reason })
      .then(({ error }) => error && console.warn("report failed", error.message));
  };
  const close = () => {
    onClose();
    setTimeout(() => setSent(false), 300);
  };
  return (
    <Sheet open={open} onClose={close} title={sent ? "Thanks for the heads up 🙏" : "Something looks off?"}>
      {sent ? (
        <p className="text-sm text-muted">Our team will check {restaurant.name}&apos;s content. You keep InsideOut honest.</p>
      ) : (
        <div className="space-y-2">
          {["Photos don't match the real place", "Looks like an old photo", "Wrong FSSAI details", "Something else"].map((t) => (
            <button key={t} onClick={() => send(t)} className="w-full rounded-2xl border border-line px-4 py-3 text-left text-sm font-semibold hover:bg-paper">
              {t}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function Fact({ top, bottom }: { top: React.ReactNode; bottom: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-card px-3 py-3 text-center">
      <p className="flex items-center justify-center gap-1 font-display text-lg leading-none font-extrabold">{top}</p>
      <p className="mt-1.5 truncate text-[11px] text-muted">{bottom}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mt-9 mb-3.5">
      <p className="flex items-center gap-1 text-[11px] font-bold tracking-widest text-grape uppercase">
        <Sparkles className="size-3" /> {eyebrow}
      </p>
      <h2 className="mt-0.5 font-display text-[26px] leading-tight font-extrabold tracking-tight">{title}</h2>
    </div>
  );
}

function TrustRow({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: { text: string; cls: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">{title}</p>
          {badge && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", badge.cls)}>{badge.text}</span>}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-card py-3 text-sm font-bold transition hover:border-ink/30"
    >
      {icon} {label}
    </a>
  );
}

function GoogleWord() {
  return (
    <span className="font-semibold">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
    </span>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div>
        <p className="text-5xl">🫣</p>
        <p className="mt-3 font-display text-2xl font-bold">Restaurant not found</p>
        <p className="mt-1 text-sm text-muted">It may not be on InsideOut yet.</p>
        <Link href="/" className="mt-5 inline-block rounded-full bg-ink px-5 py-3 font-bold text-white">
          Explore restaurants
        </Link>
      </div>
    </main>
  );
}