"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, ArrowRight, Camera, Check, FileCheck2, Loader2, Search, Sparkles, Upload } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { ALL_SECTIONS, SECTIONS, VEG_SECTIONS } from "@/lib/sections";
import { AREAS, areaByName } from "@/lib/areas";
import { CUISINES, IMG } from "@/lib/seed";
import { latestBySection } from "@/lib/freshness";
import { extFor } from "@/lib/image";
import { DOCS_BUCKET, authHeader, supabase } from "@/lib/supabase";
import { cn } from "@/lib/format";
import type { Fssai, Restaurant, SectionKey } from "@/lib/types";
import type { PlaceResult } from "@/app/api/places/search/route";
import { CameraCapture } from "../camera-capture";
import { Button, Field, Logo, Media, Splash, inputCls } from "../ui";

const STEPS = ["Register", "Verify", "Build profile", "Publish"];

const SAMPLES: Record<SectionKey, string> = {
  kitchen: IMG.kitchenTeam,
  fridge: IMG.fridge,
  meat: IMG.meat,
  veggies: IMG.veggiesShelf,
  food: IMG.curries,
  dining: IMG.diningBright,
};

const slugify = (s: string) =>
  `${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "restaurant"}-${Math.random().toString(36).slice(2, 6)}`;

export function Onboarding() {
  const { ready, user, owner } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace(`/business/login?next=${encodeURIComponent(path)}`);
  }, [ready, user, router, path]);

  if (!ready || !user) return <Splash />;
  if (owner?.status === "live" || (justPublished && owner)) return <Published r={owner} />;
  return <OnboardingForm existing={owner} onPublished={() => setJustPublished(true)} />;
}

function OnboardingForm({ existing, onPublished }: { existing?: Restaurant; onPublished: () => void }) {
  const { user, refresh, uploadMedia } = useStore();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(existing?.id ?? null);

  // Step 1
  const [gq, setGq] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [googleDown, setGoogleDown] = useState(false);
  const [hit, setHit] = useState<PlaceResult | null>(null);
  const [name, setName] = useState(existing?.name ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [area, setArea] = useState(existing?.area ?? AREAS[0].name);
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [cuisines, setCuisines] = useState<string[]>(existing?.cuisines ?? []);
  const [open, setOpen] = useState(existing?.hours.open ?? "11:00");
  const [close, setClose] = useState(existing?.hours.close ?? "23:00");
  const [isVeg, setIsVeg] = useState(existing?.isVeg ?? false);
  const [priceForTwo, setPriceForTwo] = useState(String(existing?.priceForTwo ?? 500));

  // Step 2
  const [fssaiNo, setFssaiNo] = useState(existing?.fssai?.number ?? "");
  const [fssaiType, setFssaiType] = useState<Fssai["type"]>(existing?.fssai?.type ?? "State License");
  const [validTill, setValidTill] = useState(existing?.fssai?.validTill ?? "");
  const [certificate, setCertificate] = useState<File | null>(null);

  // Step 3
  const [camera, setCamera] = useState<SectionKey | null>(null);
  const [swiggy, setSwiggy] = useState(existing?.links.swiggy ?? "");
  const [zomato, setZomato] = useState(existing?.links.zomato ?? "");

  const sections = isVeg ? VEG_SECTIONS : ALL_SECTIONS;
  const media = existing ? latestBySection(existing) : {};
  const captured = sections.filter((k) => media[k]);

  const canNext = [
    name.trim() && address.trim() && cuisines.length > 0,
    /^\d{14}$/.test(fssaiNo),
    !!media.kitchen && captured.length >= 3,
    true,
  ][step];

  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), [step]);

  async function searchGoogle() {
    if (gq.trim().length < 3 || searching) return;
    setSearching(true);
    setGoogleDown(false);
    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ query: gq }),
      });
      const data = (await res.json()) as { results?: PlaceResult[]; unavailable?: boolean };
      setResults(data.results ?? []);
      setGoogleDown(!!data.unavailable);
    } catch {
      setResults([]);
      setGoogleDown(true);
    } finally {
      setSearching(false);
    }
  }

  const pickHit = (h: PlaceResult) => {
    setHit(h);
    setName(h.name);
    setAddress(h.address);
    setArea(h.area);
    if (h.phone) setPhone(h.phone);
    if (h.hours) {
      setOpen(h.hours.open);
      setClose(h.hours.close);
    }
    setResults(null);
    setGq("");
  };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const saveBasics = () =>
    run(async () => {
      const c = areaByName(area);
      const row = {
        name: name.trim(),
        tagline: `${cuisines.slice(0, 2).join(" & ")} in ${area}`,
        cuisines,
        area,
        address: address.trim(),
        phone: phone.trim() || null,
        lat: hit?.lat ?? existing?.lat ?? c.lat,
        lng: hit?.lng ?? existing?.lng ?? c.lng,
        opens_at: open,
        closes_at: close,
        price_for_two: Number(priceForTwo) || 500,
        is_veg: isVeg,
        sections,
        ...(hit && {
          google_place_id: hit.placeId,
          google_rating: hit.rating,
          google_rating_count: hit.count,
          google_maps_url: hit.mapsUrl || null,
          google_synced_at: new Date().toISOString(),
        }),
      };
      if (restaurantId) {
        const { error } = await supabase.from("restaurants").update(row).eq("id", restaurantId);
        if (error) throw new Error(error.message);
      } else {
        const id = newId();
        const { error } = await supabase.from("restaurants").insert({ id, slug: slugify(name), ...row });
        if (error) {
          if (error.code === "23505" && error.message.includes("google_place_id"))
            throw new Error("This Google listing is already on InsideOut. Contact us if it's yours.");
          throw new Error(error.message);
        }
        setRestaurantId(id);
      }
      await refresh();
      setStep(1);
    });

  const saveFssai = () =>
    run(async () => {
      if (!restaurantId) throw new Error("Restaurant not saved yet");
      let certificatePath: string | undefined;
      if (certificate) {
        const path = `${restaurantId}/fssai-${newId()}.${extFor(certificate.type)}`;
        const up = await supabase.storage.from(DOCS_BUCKET).upload(path, certificate, { contentType: certificate.type });
        if (up.error) throw new Error(`Certificate upload failed: ${up.error.message}`);
        certificatePath = path;
      }
      const fields = {
        license_number: fssaiNo,
        license_type: fssaiType,
        valid_till: validTill || null,
        ...(certificatePath && { certificate_path: certificatePath }),
      };
      const ins = await supabase.from("fssai_licenses").insert({ restaurant_id: restaurantId, ...fields });
      if (ins.error?.code === "23505") {
        const upd = await supabase.from("fssai_licenses").update(fields).eq("restaurant_id", restaurantId);
        if (upd.error) throw new Error(upd.error.message);
      } else if (ins.error) {
        throw new Error(ins.error.message);
      }
      await refresh();
      setStep(2);
    });

  const useSamples = () =>
    run(async () => {
      if (!restaurantId) return;
      const missing = sections.filter((k) => !media[k]);
      const { error } = await supabase
        .from("media")
        .insert(missing.map((k) => ({ restaurant_id: restaurantId, section: k, kind: "photo", storage_path: SAMPLES[k] })));
      if (error) throw new Error(error.message);
      await refresh();
    });

  const saveLinks = () =>
    run(async () => {
      const { error } = await supabase
        .from("restaurants")
        .update({ swiggy_url: swiggy.trim() || null, zomato_url: zomato.trim() || null })
        .eq("id", restaurantId!);
      if (error) throw new Error(error.message);
      await refresh();
      setStep(3);
    });

  const publish = () =>
    run(async () => {
      const cover = media.food ?? media.dining ?? media.kitchen;
      const { error } = await supabase
        .from("restaurants")
        .update({ status: "live", cover_path: cover?.kind === "photo" ? cover.src : null })
        .eq("id", restaurantId!);
      if (error) throw new Error(error.message);
      onPublished();
      await refresh();
    });

  const next = [saveBasics, saveFssai, saveLinks, publish][step];

  return (
    <div className="min-h-dvh pb-36">
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  searchGoogle();
                }}
                className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-card py-1.5 pr-1.5 pl-4"
              >
                <Search className="size-5 shrink-0" />
                <input
                  value={gq}
                  onChange={(e) => {
                    setGq(e.target.value);
                    setResults(null);
                  }}
                  placeholder="Your restaurant name + area"
                  aria-label="Search your restaurant on Google"
                  className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none"
                />
                <Button type="submit" disabled={gq.trim().length < 3 || searching} className="shrink-0 px-4 py-2.5 text-sm">
                  {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
                </Button>
              </form>
              {results && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
                  {results.map((h) => (
                    <button key={h.placeId} onClick={() => pickHit(h)} className="flex w-full items-start gap-3 border-b border-line p-3.5 text-left last:border-0 hover:bg-paper">
                      <span className="mt-0.5 text-lg">📍</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{h.name}</span>
                        <span className="block truncate text-xs text-muted">{h.address}</span>
                      </span>
                      {h.rating != null && (
                        <span className="shrink-0 text-xs font-bold">
                          {h.rating} ★ <span className="font-normal text-muted">({h.count.toLocaleString("en-IN")})</span>
                        </span>
                      )}
                    </button>
                  ))}
                  {results.length === 0 && (
                    <p className="p-4 text-sm text-muted">
                      {googleDown ? "Google search isn't available right now. Fill in your details below 👇" : "No match on Google. Try adding your area, or fill in below."}
                    </p>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">Press Search once. Each search is a single lookup on Google Maps.</p>
            {hit && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-fresh-ink">
                <Check className="size-4" /> Linked to Google
                {hit.rating != null && ` · ${hit.rating} ★ from ${hit.count.toLocaleString("en-IN")} reviews`}
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
                      <option key={a.name}>{a.name}</option>
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
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
                <span className="grid size-9 place-items-center rounded-full bg-fresh text-white">
                  <Check className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Account verified</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>
              </div>

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
                    <span className="truncate">{certificate ? certificate.name : "Upload license certificate (photo or PDF)"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f && f.size > 10 * 1024 * 1024) return setError("Certificate must be under 10 MB");
                        setCertificate(f);
                      }}
                    />
                  </label>
                  <p className="text-[11px] text-muted">Certificates are private. Only you and the InsideOut team can see them.</p>
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
                          <p className="text-[11px] text-white/70">Tap to add another</p>
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
              {captured.length < sections.length && (
                <button onClick={useSamples} disabled={busy} className="flex items-center gap-1 font-bold text-grape disabled:opacity-50">
                  <Sparkles className="size-3.5" /> Fill the rest with sample photos (demo)
                </button>
              )}
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
                  <SummaryRow ok text={`${captured.length} areas shown, each with its upload time`} />
                  <SummaryRow ok text={`Account · ${user?.email}`} />
                  <SummaryRow ok={false} text={`FSSAI ${fssaiNo}: our team will verify within 24h`} />
                  <SummaryRow
                    ok={!!existing?.google}
                    text={existing?.google ? `Google rating ${existing.google.rating} ★ linked` : "Google listing not linked"}
                  />
                </ul>
                {existing && (
                  <Link href={`/r/${existing.slug}`} className="mt-4 inline-block text-sm font-bold underline">
                    Preview my profile ↗
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-5 py-4">
          {error && <p className="mb-2 rounded-2xl bg-stale/10 px-3 py-2 text-sm font-semibold text-stale">{error}</p>}
          <Button variant={step === 3 ? "lime" : "ink"} className="w-full py-4 text-base" disabled={!canNext || busy} onClick={next}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : step === 3 ? "🚀 Publish my profile" : <>Save & continue <ArrowRight className="size-5" /></>}
          </Button>
        </div>
      </div>

      {camera && restaurantId && (
        <CameraCapture
          section={camera}
          onClose={() => setCamera(null)}
          onCaptured={async (blob, kind, caption) => {
            await uploadMedia(restaurantId, camera, blob, kind, caption);
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
