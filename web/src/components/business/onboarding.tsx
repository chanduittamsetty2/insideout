"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, ArrowRight, Camera, Check, FileCheck2, Loader2, Mail, Search, Sparkles, Upload } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { ALL_SECTIONS, SECTIONS, VEG_SECTIONS } from "@/lib/sections";
import { AREAS, CUISINES, IMG } from "@/lib/seed";
import { cn } from "@/lib/format";
import type { Fssai, Media as MediaT, Restaurant, SectionKey } from "@/lib/types";
import { CameraCapture } from "../camera-capture";
import { Button, Field, Logo, Media, inputCls } from "../ui";

const STEPS = ["Register", "Verify", "Build profile", "Publish"];
const DEMO_OTP = "123456";

interface GoogleHit {
  name: string;
  address: string;
  area: string;
  phone: string;
  rating: number;
  count: number;
}

function mockGoogle(q: string): GoogleHit[] {
  const name = q.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return [
    { name, address: "Road No. 10, Banjara Hills, Hyderabad 500034", area: "Banjara Hills", phone: "+91 40 2335 1234", rating: 4.4, count: 1836 },
    { name: `${name} Restaurant`, address: "Hitech City Main Road, Madhapur, Hyderabad 500081", area: "Madhapur", phone: "+91 98490 12345", rating: 4.1, count: 642 },
  ];
}

export function Onboarding() {
  const { ready, saveCapture, createRestaurant } = useStore();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState<Restaurant | null>(null);

  // Step 1
  const [gq, setGq] = useState("");
  const [hit, setHit] = useState<GoogleHit | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [phone, setPhone] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [open, setOpen] = useState("11:00");
  const [close, setClose] = useState("23:00");
  const [isVeg, setIsVeg] = useState(false);
  const [priceForTwo, setPriceForTwo] = useState("500");

  // Step 2
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [fssaiNo, setFssaiNo] = useState("");
  const [fssaiType, setFssaiType] = useState<Fssai["type"]>("State License");
  const [validTill, setValidTill] = useState("");
  const [certificate, setCertificate] = useState<string | null>(null);

  // Step 3
  const [media, setMedia] = useState<Partial<Record<SectionKey, MediaT>>>({});
  const [camera, setCamera] = useState<SectionKey | null>(null);
  const [swiggy, setSwiggy] = useState("");
  const [zomato, setZomato] = useState("");

  const sections = isVeg ? VEG_SECTIONS : ALL_SECTIONS;
  const emailVerified = otp === DEMO_OTP;
  const captured = sections.filter((k) => media[k]);

  const canNext = [
    name.trim() && address.trim() && phone.trim() && cuisines.length > 0,
    emailVerified && /^\d{14}$/.test(fssaiNo) && ownerName.trim(),
    !!media.kitchen && captured.length >= 3,
    true,
  ][step];

  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), [step]);

  const pickHit = (h: GoogleHit) => {
    setHit(h);
    setName(h.name);
    setAddress(h.address);
    setArea(h.area);
    setPhone(h.phone);
    setGq("");
  };

  const useSamples = () => {
    const now = Date.now();
    const samples: Record<SectionKey, string> = {
      kitchen: IMG.kitchenTeam,
      fridge: IMG.fridge,
      meat: IMG.meat,
      veggies: IMG.veggiesShelf,
      food: IMG.curries,
      dining: IMG.diningBright,
    };
    setMedia(
      Object.fromEntries(
        sections.map((k) => [k, { id: uid(), section: k, kind: "photo", src: samples[k], capturedAt: now } satisfies MediaT]),
      ),
    );
  };

  const publish = () => {
    const all = Object.values(media).filter(Boolean) as MediaT[];
    const food = media.food ?? media.kitchen;
    const created = createRestaurant({
      name: name.trim(),
      tagline: `${cuisines.slice(0, 2).join(" & ")} in ${area}`,
      cuisines,
      area,
      address,
      phone,
      hours: { open, close },
      priceForTwo: Number(priceForTwo) || 500,
      isVeg,
      google: hit
        ? { rating: hit.rating, count: hit.count, mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hit.name} ${hit.address}`)}` }
        : null,
      links: { swiggy: swiggy.trim() || undefined, zomato: zomato.trim() || undefined },
      fssai: { number: fssaiNo, type: fssaiType, validTill: validTill || "2027-12-31", verified: false },
      cover: food?.src ?? IMG.spread,
      sections,
      media: all,
      ownerEmail: email,
    });
    setPublished(created);
  };

  if (!ready) return null;
  if (published) return <Published r={published} />;

  return (
    <div className="min-h-dvh pb-32">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-3">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="grid size-9 place-items-center rounded-full bg-card" aria-label="Back">
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <Link href="/business" className="grid size-9 place-items-center rounded-full bg-card" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <Logo className="text-lg" />
          <span className="ml-auto text-xs font-semibold text-muted">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mx-auto flex max-w-xl gap-1.5 px-5 pb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-ink" : "bg-line")} />
              <p className={cn("mt-1 text-[10px] font-bold tracking-wide uppercase", i === step ? "text-ink" : "text-muted/70")}>{s}</p>
            </div>
          ))}
        </div>
      </header>

      <main key={step} className="mx-auto max-w-xl animate-rise px-5 pt-6">
        {step === 0 && (
          <>
            <StepTitle title="Register your restaurant" sub="Find yourself on Google and we'll fill in the boring bits." />
            <div className="relative">
              <label className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card px-4 py-3.5">
                <Search className="size-5" />
                <input
                  value={gq}
                  onChange={(e) => setGq(e.target.value)}
                  placeholder="Search your restaurant on Google"
                  className="flex-1 bg-transparent text-[15px] outline-none"
                />
              </label>
              {gq.trim().length >= 3 && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
                  {mockGoogle(gq).map((h) => (
                    <button key={h.address} onClick={() => pickHit(h)} className="flex w-full items-start gap-3 border-b border-line p-3.5 text-left last:border-0 hover:bg-paper">
                      <span className="mt-0.5 text-lg">📍</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{h.name}</span>
                        <span className="block truncate text-xs text-muted">{h.address}</span>
                      </span>
                      <span className="shrink-0 text-xs font-bold">
                        {h.rating} ★ <span className="font-normal text-muted">({h.count.toLocaleString("en-IN")})</span>
                      </span>
                    </button>
                  ))}
                  <p className="bg-paper px-3.5 py-2 text-[11px] text-muted">Demo results · live Google Places data once the API key is added</p>
                </div>
              )}
            </div>
            {hit && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-fresh-ink">
                <Check className="size-4" /> Linked to Google · {hit.rating} ★ from {hit.count.toLocaleString("en-IN")} reviews
              </p>
            )}

            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or fill in manually <span className="h-px flex-1 bg-line" />
            </div>

            <div className="space-y-4">
              <Field label="Restaurant name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nizam's Table" />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, pincode" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Area">
                  <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value)}>
                    {AREAS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 98xxx xxxxx" />
                </Field>
              </div>
              <Field label="Cuisine" group>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => {
                    const on = cuisines.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => setCuisines((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                          on ? "border-ink bg-ink text-white" : "border-line bg-card",
                        )}
                      >
                        {on && "✓ "}
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Opens at">
                  <input type="time" className={inputCls} value={open} onChange={(e) => setOpen(e.target.value)} />
                </Field>
                <Field label="Closes at">
                  <input type="time" className={inputCls} value={close} onChange={(e) => setClose(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price for two (₹)">
                  <input className={inputCls} inputMode="numeric" value={priceForTwo} onChange={(e) => setPriceForTwo(e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Food type" group>
                  <div className="flex rounded-2xl border border-line bg-card p-1">
                    {[
                      [false, "Veg + non-veg"],
                      [true, "Pure veg"],
                    ].map(([v, l]) => (
                      <button
                        key={String(v)}
                        onClick={() => setIsVeg(v as boolean)}
                        className={cn("flex-1 rounded-xl py-2.5 text-xs font-bold", isVeg === v ? "bg-ink text-white" : "text-muted")}
                      >
                        {l as string}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <StepTitle title="Verify your restaurant" sub="Quick checks so customers know you're the real deal." />
            <div className="space-y-4">
              <Field label="Your name">
                <input className={inputCls} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner or manager name" />
              </Field>
              <Field label="Email" group>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    type="email"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setOtpSent(false);
                      setOtp("");
                    }}
                    placeholder="you@restaurant.com"
                  />
                  <Button variant={otpSent ? "ghost" : "ink"} disabled={!/\S+@\S+\.\S+/.test(email)} onClick={() => setOtpSent(true)} className="shrink-0">
                    <Mail className="size-4" /> {otpSent ? "Resend" : "Send code"}
                  </Button>
                </div>
              </Field>
              {otpSent && (
                <div className="animate-rise rounded-2xl border border-line bg-card p-4">
                  <p className="text-sm font-semibold">Enter the 6-digit code sent to {email}</p>
                  <OtpInput value={otp} onChange={setOtp} />
                  {emailVerified ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-fresh-ink">
                      <Check className="size-4" /> Email verified
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      Demo code: <span className="font-mono font-bold text-ink">{DEMO_OTP}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-[24px] bg-card p-4 ring-1 ring-line">
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  <FileCheck2 className="size-5 text-grape" /> FSSAI details
                </p>
                <p className="mb-4 text-xs text-muted">Shown on your profile. Our team checks it against the FSSAI FoSCoS portal.</p>
                <div className="space-y-3">
                  <Field label="FSSAI license number" hint={fssaiNo && !/^\d{14}$/.test(fssaiNo) ? "Must be 14 digits" : undefined}>
                    <input
                      className={cn(inputCls, "font-mono tracking-wider")}
                      inputMode="numeric"
                      maxLength={14}
                      value={fssaiNo}
                      onChange={(e) => setFssaiNo(e.target.value.replace(/\D/g, ""))}
                      placeholder="14-digit number"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type">
                      <select className={inputCls} value={fssaiType} onChange={(e) => setFssaiType(e.target.value as Fssai["type"])}>
                        <option>Registration</option>
                        <option>State License</option>
                        <option>Central License</option>
                      </select>
                    </Field>
                    <Field label="Valid till">
                      <input type="date" className={inputCls} value={validTill} onChange={(e) => setValidTill(e.target.value)} />
                    </Field>
                  </div>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3.5 text-sm font-bold",
                      certificate ? "border-fresh bg-fresh/10 text-fresh-ink" : "border-line",
                    )}
                  >
                    {certificate ? <Check className="size-4" /> : <Upload className="size-4" />}
                    {certificate ? certificate : "Upload license certificate (photo or PDF)"}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setCertificate(e.target.files?.[0]?.name ?? null)} />
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepTitle title="Build your InsideOut profile" sub="Snap each area live. Add at least 3, including your kitchen." />
            <div className="grid grid-cols-2 gap-2.5">
              {SECTIONS.filter((s) => sections.includes(s.key)).map((s) => {
                const m = media[s.key];
                return (
                  <button
                    key={s.key}
                    onClick={() => setCamera(s.key)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-[22px] text-left transition active:scale-[0.97]",
                      m ? "bg-ink" : "border-2 border-dashed border-line bg-card hover:border-ink/40",
                    )}
                  >
                    {m ? (
                      <>
                        <Media src={m.src} kind={m.kind} className="absolute inset-0 size-full" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                        <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-lime">
                          <Check className="size-4" />
                        </span>
                        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                          <p className="font-display font-bold">
                            {s.emoji} {s.label}
                          </p>
                          <p className="text-[11px] text-white/70">Tap to retake</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full flex-col justify-between p-4">
                        <span className="text-3xl">{s.emoji}</span>
                        <div>
                          <p className="font-display font-bold">
                            {s.label}
                            {s.key === "kitchen" && <span className="ml-1 text-xs text-stale">*</span>}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                            <Camera className="size-3.5" /> Snap now
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">
                {captured.length} of {sections.length} added
              </span>
              <button onClick={useSamples} className="flex items-center gap-1 font-bold text-grape">
                <Sparkles className="size-3.5" /> Fill with sample photos (demo)
              </button>
            </div>

            <div className="mt-8 space-y-3">
              <p className="font-display text-lg font-bold">Delivery links (optional)</p>
              <input className={inputCls} value={swiggy} onChange={(e) => setSwiggy(e.target.value)} placeholder="Swiggy restaurant link" />
              <input className={inputCls} value={zomato} onChange={(e) => setZomato(e.target.value)} placeholder="Zomato restaurant link" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepTitle title="Ready to go live?" sub="Here's what customers will see. You can update it any time." />
            <div className="overflow-hidden rounded-[28px] border border-line bg-card">
              <div className="grid grid-cols-3 gap-0.5 bg-line">
                {captured.slice(0, 6).map((k) => (
                  <Media key={k} src={media[k]!.src} kind={media[k]!.kind} className="aspect-square w-full" />
                ))}
              </div>
              <div className="p-5">
                <p className="font-display text-2xl font-extrabold">{name}</p>
                <p className="text-sm text-muted">
                  {cuisines.join(", ")} · {area}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <SummaryRow ok text={`${captured.length} areas shown, all stamped just now`} />
                  <SummaryRow ok text={`Email verified · ${email}`} />
                  <SummaryRow ok={false} text={`FSSAI ${fssaiNo}: our team will verify within 24h`} />
                  <SummaryRow ok={!!hit} text={hit ? `Google rating ${hit.rating} ★ linked` : "Google listing not linked"} />
                </ul>
              </div>
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-5 py-4">
          {step < 3 ? (
            <Button className="w-full py-4" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continue <ArrowRight className="size-5" />
            </Button>
          ) : (
            <Button variant="lime" className="w-full py-4 text-base" onClick={publish}>
              🚀 Publish my profile
            </Button>
          )}
        </div>
      </div>

      {camera && (
        <CameraCapture
          section={camera}
          onClose={() => setCamera(null)}
          onCaptured={async (blob, kind, caption) => {
            const m = await saveCapture(camera, blob, kind, caption);
            setMedia((prev) => ({ ...prev, [camera]: m }));
          }}
        />
      )}
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[34px] leading-[1] font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">{sub}</p>
    </div>
  );
}

function SummaryRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", ok ? "bg-fresh text-white" : "bg-aging/20 text-aging-ink")}>
        {ok ? <Check className="size-3" /> : <Loader2 className="size-3" />}
      </span>
      {text}
    </li>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative mt-3 flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "grid h-12 flex-1 place-items-center rounded-xl border-2 font-mono text-xl font-bold",
            value.length === i ? "border-ink" : "border-line",
            value.length === 6 && value === DEMO_OTP && "border-fresh bg-fresh/10",
          )}
        >
          {value[i] ?? ""}
        </span>
      ))}
      <input
        autoFocus
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="absolute inset-0 opacity-0"
        aria-label="Verification code"
      />
    </label>
  );
}

function Published({ r }: { r: Restaurant }) {
  const url = useMemo(() => (typeof window !== "undefined" ? `${window.location.origin}/r/${r.slug}` : `/r/${r.slug}`), [r.slug]);
  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        e: ["🎉", "✨", "🍛", "🟢", "👀", "🔥"][i % 6],
        left: i % 2 ? 1 + ((i * 7) % 10) : 88 + ((i * 5) % 10),
        delay: (i % 6) * 90,
        top: 4 + ((i * 37) % 80),
      })),
    [],
  );

  return (
    <main className="relative mx-auto min-h-dvh max-w-xl overflow-hidden px-5 pt-14 pb-16 text-center">
      {confetti.map((c, i) => (
        <span key={i} className="pointer-events-none absolute animate-pop text-2xl" style={{ left: `${c.left}%`, top: `${c.top}%`, animationDelay: `${c.delay}ms` }}>
          {c.e}
        </span>
      ))}
      <div className="relative animate-rise">
        <p className="text-6xl">🎉</p>
        <h1 className="mt-4 font-display text-4xl leading-[1] font-extrabold tracking-tight">Your InsideOut profile is live.</h1>
        <p className="mt-3 text-muted">Customers can now see what&apos;s happening behind your food.</p>

        <div className="mx-auto mt-8 max-w-xs rounded-[32px] bg-ink p-6 text-white shadow-2xl">
          <p className="font-display text-xl font-bold">{r.name}</p>
          <div className="mx-auto mt-4 w-fit rounded-3xl bg-white p-4">
            <QRCodeSVG value={`${url}?src=table`} size={180} />
          </div>
          <p className="mt-4 font-display text-lg font-bold">Show your customers what&apos;s inside.</p>
          <p className="mt-1 text-xs text-white/50">Scan to peek inside 👀</p>
        </div>

        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          <Link href={`/r/${r.slug}`} className="rounded-full bg-lime px-4 py-3.5 font-bold">
            View my profile
          </Link>
          <Link href="/business/qr" className="rounded-full bg-ink px-4 py-3.5 font-bold text-white">
            Print QR kit
          </Link>
          <Link href="/business/dashboard" className="rounded-full border border-line bg-card px-4 py-3.5 font-bold">
            Dashboard
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">Put it on tables, counter, menu, receipts and your entrance.</p>
      </div>
    </main>
  );
}
