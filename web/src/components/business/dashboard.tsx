"use client";

import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, ArrowUpRight, Camera, Eye, Gift, PartyPopper, QrCode, Star, UtensilsCrossed } from "lucide-react";
import { useStore } from "@/lib/store";
import { exactStamp, freshLevel, latestBySection, timeAgo, transparencyScore } from "@/lib/freshness";
import { SECTIONS, sectionInfo } from "@/lib/sections";
import { cn, greeting, num } from "@/lib/format";
import type { SectionKey } from "@/lib/types";
import { CameraCapture } from "../camera-capture";
import { Button, Field, FreshChip, Media, ScoreRing, Sheet, Splash, inputCls } from "../ui";
import { BizHeader } from "./biz-header";

type Form = "special" | "offer" | "event" | null;

export function Dashboard() {
  const { ready, owner: r, now, saveCapture, addMedia, setSpecial, addPost } = useStore();
  const [camera, setCamera] = useState<SectionKey | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!ready) return <Splash />;
  if (!r)
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="font-display text-2xl font-bold">No restaurant yet</p>
          <Link href="/business/onboarding" className="mt-4 inline-block rounded-full bg-ink px-5 py-3 font-bold text-white">
            Start onboarding
          </Link>
        </div>
      </div>
    );

  const latest = latestBySection(r);
  const score = transparencyScore(r, now);
  const sections = SECTIONS.filter((s) => r.sections.includes(s.key));
  const stalest = sections
    .map((s) => ({ s, ts: latest[s.key]?.capturedAt }))
    .filter(({ ts }) => freshLevel(ts, now) !== "fresh")
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))[0];
  const activity = [...r.media].sort((a, b) => b.capturedAt - a.capturedAt).slice(0, 6);
  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${r.slug}` : `/r/${r.slug}`;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="min-h-dvh pb-24">
      <BizHeader profileSlug={r.slug} />

      <main className="mx-auto max-w-5xl px-5 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              {greeting(now)}, {r.name} 👋
            </h1>
          </div>
          <Link
            href={`/r/${r.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-bold"
          >
            <Eye className="size-4" /> See what customers see
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Profile views" value={num(r.stats.profileViews)} delta="+12% this week" />
          <Stat label="Kitchen views" value={num(r.stats.kitchenViews)} delta="+18% this week" accent />
          <Stat label="QR scans" value={num(r.stats.qrScans)} delta="Table QR is #1" />
          <Stat label="Reviews" value={num(r.stats.reviews)} delta={r.google ? `${r.google.rating} ★ on Google` : "—"} />
        </div>

        {stalest && (
          <button
            onClick={() => setCamera(stalest.s.key)}
            className={cn(
              "mt-4 flex w-full items-center gap-3 rounded-[22px] p-4 text-left",
              freshLevel(stalest.ts, now) === "outdated" || !stalest.ts ? "bg-stale/10" : "bg-aging/15",
            )}
          >
            <AlertTriangle className={cn("size-5 shrink-0", freshLevel(stalest.ts, now) === "aging" ? "text-aging-ink" : "text-stale")} />
            <p className="flex-1 text-sm">
              <span className="font-bold">
                {stalest.s.emoji} {stalest.s.label}
              </span>{" "}
              {stalest.ts ? `was last updated ${timeAgo(stalest.ts, now)}.` : "hasn't been shared yet."} Customers notice. Snap a fresh one?
            </p>
            <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">Update</span>
          </button>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Update your restaurant</h2>
            <p className="text-sm text-muted">You control what customers see. Every upload is time-stamped automatically.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
              <Action emoji="👨‍🍳" label="Upload Kitchen" onClick={() => setCamera("kitchen")} primary />
              <Action emoji="🧊" label="Upload Refrigerator" onClick={() => setCamera("fridge")} />
              <Action emoji="🍛" label="Upload Food Items" onClick={() => setCamera("food")} />
              <Action icon={<UtensilsCrossed className="size-5" />} label="Today's Special" onClick={() => setForm("special")} />
              <Action icon={<Gift className="size-5" />} label="Offer" onClick={() => setForm("offer")} />
              <Action icon={<PartyPopper className="size-5" />} label="Event" onClick={() => setForm("event")} />
            </div>

            <h3 className="mt-9 font-display text-xl font-bold">Freshness health</h3>
            <div className="mt-3 divide-y divide-line overflow-hidden rounded-[26px] border border-line bg-card">
              {sections.map((s) => {
                const m = latest[s.key];
                return (
                  <div key={s.key} className="flex items-center gap-3 p-3">
                    {m ? (
                      <Media src={m.src} kind={m.kind} className="size-14 shrink-0 rounded-2xl" />
                    ) : (
                      <div className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-line text-xl">{s.emoji}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {s.emoji} {s.label}
                      </p>
                      <p className="truncate text-xs text-muted">{m ? `Uploaded ${exactStamp(m.capturedAt)}` : "Not shared yet"}</p>
                    </div>
                    <FreshChip ts={m?.capturedAt} now={now} className="hidden sm:inline-flex" />
                    <button
                      onClick={() => setCamera(s.key)}
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-95"
                      aria-label={`Update ${s.label}`}
                    >
                      <Camera className="size-[18px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] bg-ink p-5 text-white">
              <div className="flex items-center gap-4">
                <ScoreRing score={score} size={72} className="[&_circle:first-child]:stroke-white/15 [&_span]:text-white" />
                <div>
                  <p className="font-display text-lg font-bold">Transparency score</p>
                  <p className="text-xs text-white/60">Show more areas, more often, to hit 100.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-line bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white p-2 ring-1 ring-line">
                  <QRCodeSVG value={`${profileUrl}?src=table`} size={84} />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg leading-tight font-bold">Your QR is live</p>
                  <p className="mt-1 text-xs text-muted">Put it on tables, counter, menu, receipts.</p>
                  <Link href="/business/qr" className="mt-2 inline-flex items-center gap-1 text-sm font-bold">
                    <QrCode className="size-4" /> Print QR kit <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-line bg-card p-5">
              <p className="font-display text-lg font-bold">Recent drops</p>
              <ul className="mt-3 space-y-3">
                {activity.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Media src={m.src} kind={m.kind} className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {sectionInfo(m.section).emoji} {sectionInfo(m.section).label}
                        {m.kind === "video" && <span className="ml-1 text-xs text-muted">· video</span>}
                      </p>
                      <p className="truncate text-[11px] text-muted">{exactStamp(m.capturedAt)}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">{timeAgo(m.capturedAt, now)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {r.special && (
              <div className="rounded-[26px] bg-lime p-5">
                <p className="text-[10px] font-extrabold tracking-widest uppercase">Live special</p>
                <p className="mt-1 font-display text-xl font-bold">
                  {r.special.name} · ₹{r.special.price}
                </p>
                <p className="text-xs text-ink/60">Posted {timeAgo(r.special.postedAt, now)}</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {camera && (
        <CameraCapture
          section={camera}
          onClose={() => setCamera(null)}
          onCaptured={async (blob, kind, caption) => {
            const m = await saveCapture(camera, blob, kind, caption);
            addMedia(r.id, m);
            flash(`${sectionInfo(camera).label} is live 🟢`);
          }}
        />
      )}

      <SpecialForm
        open={form === "special"}
        onClose={() => setForm(null)}
        onSave={(s) => {
          setSpecial(r.id, { ...s, image: s.image ?? r.special?.image });
          flash("Today's special is live 🍛");
        }}
        onPhoto={async (blob) => {
          const m = await saveCapture("food", blob, "photo");
          addMedia(r.id, m);
          return m.src;
        }}
      />
      <PostForm
        kind={form === "event" ? "event" : "offer"}
        open={form === "offer" || form === "event"}
        onClose={() => setForm(null)}
        onSave={(p) => {
          addPost(r.id, p);
          flash(p.kind === "offer" ? "Offer posted 🎁" : "Event posted 🎉");
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 animate-pop rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, delta, accent }: { label: string; value: string; delta: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-[22px] p-4", accent ? "bg-lime" : "border border-line bg-card")}>
      <p className={cn("text-xs font-semibold", accent ? "text-ink/70" : "text-muted")}>{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">{value}</p>
      <p className={cn("mt-0.5 text-[11px]", accent ? "text-ink/70" : "text-muted")}>{delta}</p>
    </div>
  );
}

function Action({
  emoji,
  icon,
  label,
  onClick,
  primary,
}: {
  emoji?: string;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex aspect-square flex-col justify-between rounded-[20px] p-3 text-left transition active:scale-[0.97] sm:aspect-[5/4] sm:p-4",
        primary ? "bg-ink text-white" : "border border-line bg-card hover:border-ink/30",
      )}
    >
      <span className="flex items-center justify-between">
        <span className="text-2xl">{emoji ?? icon}</span>
        <span className={cn("grid size-7 place-items-center rounded-full text-lg font-bold", primary ? "bg-lime text-ink" : "bg-paper")}>+</span>
      </span>
      <span className="font-display text-[13px] leading-tight font-bold sm:text-[15px]">{label}</span>
    </button>
  );
}

function SpecialForm({
  open,
  onClose,
  onSave,
  onPhoto,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: { name: string; price: number; note?: string; image?: string }) => void;
  onPhoto: (blob: Blob) => Promise<string>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [cam, setCam] = useState(false);

  const submit = () => {
    onSave({ name: name.trim(), price: Number(price), note: note.trim() || undefined, image });
    setName("");
    setPrice("");
    setNote("");
    setImage(undefined);
    onClose();
  };

  return (
    <>
      <Sheet open={open && !cam} onClose={onClose} title="Today's special 🍛">
        <div className="space-y-3">
          <Field label="Dish name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Chicken Dum Biryani" />
          </Field>
          <Field label="Price (₹)">
            <input className={inputCls} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="299" />
          </Field>
          <Field label="Short note (optional)">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Served with salan & raita" />
          </Field>
          <button
            onClick={() => setCam(true)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm font-bold",
              image ? "border-fresh bg-fresh/10 text-fresh-ink" : "border-line",
            )}
          >
            <Camera className="size-4" /> {image ? "Photo added ✓" : "Snap the dish (optional)"}
          </button>
          <Button className="w-full" disabled={!name.trim() || !price} onClick={submit}>
            <Star className="size-4" /> Post special
          </Button>
        </div>
      </Sheet>
      {open && cam && (
        <CameraCapture
          section="food"
          onClose={() => setCam(false)}
          onCaptured={async (blob) => setImage(await onPhoto(blob))}
        />
      )}
    </>
  );
}

function PostForm({
  kind,
  open,
  onClose,
  onSave,
}: {
  kind: "offer" | "event";
  open: boolean;
  onClose: () => void;
  onSave: (p: { kind: "offer" | "event"; title: string; detail?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title={kind === "offer" ? "New offer 🎁" : "New event 🎉"}>
      <div className="space-y-3">
        <Field label="Title">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "offer" ? "20% off on family packs" : "Live music night"}
          />
        </Field>
        <Field label="Details (optional)">
          <input
            className={inputCls}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={kind === "offer" ? "Valid till Sunday" : "Saturday · 8 PM"}
          />
        </Field>
        <Button
          className="w-full"
          disabled={!title.trim()}
          onClick={() => {
            onSave({ kind, title: title.trim(), detail: detail.trim() || undefined });
            setTitle("");
            setDetail("");
            onClose();
          }}
        >
          Post {kind}
        </Button>
      </div>
    </Sheet>
  );
}
