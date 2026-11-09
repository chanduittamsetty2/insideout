"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, Ban, Eye, FileText, Flag, Loader2, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { DOCS_BUCKET, authHeader, publicUrl, supabase } from "@/lib/supabase";
import { exactStamp, timeAgo } from "@/lib/freshness";
import { sectionInfo } from "@/lib/sections";
import { cn } from "@/lib/format";
import type { RestaurantStatus, SectionKey } from "@/lib/types";
import { Logo, Media, Splash } from "./ui";

interface AdminRestaurant {
  id: string;
  slug: string;
  name: string;
  area: string;
  status: RestaurantStatus;
  is_demo: boolean;
  created_at: string;
  fssai_licenses: { license_number: string; license_type: string; certificate_path: string | null; verified_at: string | null } | null;
  media: { id: string; section: SectionKey; kind: "photo" | "video"; storage_path: string; captured_at: string; review: "approved" | "rejected" }[];
}

interface AdminReport {
  id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  restaurant_id: string;
  restaurants: { name: string; slug: string } | null;
}

type Tab = "restaurants" | "photos" | "reports";

export function Admin() {
  const { ready, user, isAdmin, signOut, refresh: refreshStore, now } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [tab, setTab] = useState<Tab>("restaurants");
  const [restaurants, setRestaurants] = useState<AdminRestaurant[] | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [r, rep] = await Promise.all([
      supabase
        .from("restaurants")
        .select("id, slug, name, area, status, is_demo, created_at, fssai_licenses(license_number, license_type, certificate_path, verified_at), media(id, section, kind, storage_path, captured_at, review)")
        .order("created_at", { ascending: false }),
      supabase.from("reports").select("id, reason, created_at, resolved_at, restaurant_id, restaurants(name, slug)").order("created_at", { ascending: false }),
    ]);
    if (r.error) setError(r.error.message);
    setRestaurants((r.data as unknown as AdminRestaurant[]) ?? []);
    setReports((rep.data as unknown as AdminReport[]) ?? []);
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace(`/business/login?next=${encodeURIComponent(path)}`);
  }, [ready, user, router, path]);

  useEffect(() => {
    if (!isAdmin) return;
    queueMicrotask(load);
  }, [isAdmin, load]);

  async function act(key: string, body: Record<string, unknown>) {
    setPending(key);
    setError("");
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Action failed");
      await Promise.all([load(), refreshStore()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPending(null);
    }
  }

  async function openCertificate(path: string) {
    const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 120);
    if (error) return setError(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (!ready || !user) return <Splash />;
  if (!isAdmin)
    return (
      <main className="grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="text-5xl">🛡️</p>
          <p className="mt-3 font-display text-2xl font-bold">Admins only</p>
          <p className="mt-1 text-sm text-muted">{user.email} isn&apos;t an InsideOut admin.</p>
          <button onClick={() => signOut()} className="mt-5 rounded-full bg-ink px-5 py-3 font-bold text-white">
            Switch account
          </button>
        </div>
      </main>
    );

  const openReports = reports.filter((r) => !r.resolved_at);
  const unverified = (restaurants ?? []).filter((r) => r.fssai_licenses && !r.fssai_licenses.verified_at);
  const allMedia = (restaurants ?? [])
    .flatMap((r) => r.media.map((m) => ({ ...m, restaurant: r })))
    .sort((a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at))
    .slice(0, 60);

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full bg-grape px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Admin</span>
          </Link>
          <button
            onClick={async () => {
              await signOut();
              router.push("/business/login");
            }}
            className="ml-auto grid size-9 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
            aria-label="Log out"
            title={`Log out ${user.email}`}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Trust & safety</h1>
        <p className="mt-1 text-sm text-muted">Verify licenses, pull bad photos, handle customer reports.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Count label="FSSAI to verify" value={restaurants ? unverified.length : "…"} tone={unverified.length ? "aging" : "fresh"} />
          <Count label="Open reports" value={restaurants ? openReports.length : "…"} tone={openReports.length ? "stale" : "fresh"} />
          <Count label="Restaurants" value={restaurants ? restaurants.length : "…"} />
        </div>

        <div className="mt-6 flex rounded-full bg-ink/5 p-1 text-sm font-semibold">
          {(
            [
              ["restaurants", "Restaurants"],
              ["photos", "Photos"],
              ["reports", `Reports${openReports.length ? ` (${openReports.length})` : ""}`],
            ] as const
          ).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={cn("flex-1 rounded-full py-2 transition", tab === key ? "bg-card shadow-sm" : "text-muted")}>
              {label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded-2xl bg-stale/10 px-3 py-2 text-sm font-semibold text-stale">{error}</p>}
        {!restaurants && (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-muted" />
          </div>
        )}

        {restaurants && tab === "restaurants" && (
          <div className="mt-5 divide-y divide-line overflow-hidden rounded-[26px] border border-line bg-card">
            {[...restaurants]
              .sort((a, b) => Number(!!a.fssai_licenses?.verified_at) - Number(!!b.fssai_licenses?.verified_at))
              .map((r) => {
                const f = r.fssai_licenses;
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-bold">
                        <Link href={`/r/${r.slug}`} className="truncate hover:underline">
                          {r.name}
                        </Link>
                        <StatusPill status={r.status} />
                        {r.is_demo && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-muted">DEMO</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {r.area} · joined {timeAgo(Date.parse(r.created_at), now)} ·{" "}
                        {f ? (
                          <>
                            FSSAI <span className="font-mono">{f.license_number}</span> ({f.license_type})
                          </>
                        ) : (
                          "no FSSAI yet"
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {f?.certificate_path && (
                        <SmallBtn onClick={() => openCertificate(f.certificate_path!)} icon={<FileText className="size-3.5" />}>
                          Certificate
                        </SmallBtn>
                      )}
                      {f && (
                        <SmallBtn
                          tone={f.verified_at ? "ghost" : "fresh"}
                          busy={pending === `f-${r.id}`}
                          onClick={() => act(`f-${r.id}`, { type: "fssai", restaurantId: r.id, verified: !f.verified_at })}
                          icon={<BadgeCheck className="size-3.5" />}
                        >
                          {f.verified_at ? "Unverify" : "Verify FSSAI"}
                        </SmallBtn>
                      )}
                      <SmallBtn
                        tone={r.status === "suspended" ? "fresh" : "stale"}
                        busy={pending === `s-${r.id}`}
                        onClick={() => act(`s-${r.id}`, { type: "status", restaurantId: r.id, status: r.status === "suspended" ? "live" : "suspended" })}
                        icon={r.status === "suspended" ? <RotateCcw className="size-3.5" /> : <Ban className="size-3.5" />}
                      >
                        {r.status === "suspended" ? "Restore" : "Suspend"}
                      </SmallBtn>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {restaurants && tab === "photos" && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allMedia.map((m) => (
              <div key={m.id} className={cn("overflow-hidden rounded-[22px] border border-line bg-card", m.review === "rejected" && "opacity-60")}>
                <div className="relative aspect-square">
                  <Media src={publicUrl(m.storage_path)} kind={m.kind} className={cn("absolute inset-0 size-full", m.review === "rejected" && "grayscale")} />
                  {m.review === "rejected" && (
                    <span className="absolute top-2 left-2 rounded-full bg-stale px-2 py-0.5 text-[10px] font-bold text-white">HIDDEN</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{m.restaurant.name}</p>
                  <p className="truncate text-[11px] text-muted">
                    {sectionInfo(m.section).emoji} {sectionInfo(m.section).label} · {exactStamp(Date.parse(m.captured_at))}
                  </p>
                  <SmallBtn
                    className="mt-2 w-full"
                    tone={m.review === "rejected" ? "fresh" : "stale"}
                    busy={pending === `m-${m.id}`}
                    onClick={() => act(`m-${m.id}`, { type: "media", mediaId: m.id, review: m.review === "rejected" ? "approved" : "rejected" })}
                    icon={m.review === "rejected" ? <Eye className="size-3.5" /> : <Ban className="size-3.5" />}
                  >
                    {m.review === "rejected" ? "Restore" : "Hide photo"}
                  </SmallBtn>
                </div>
              </div>
            ))}
          </div>
        )}

        {restaurants && tab === "reports" && (
          <div className="mt-5 space-y-2.5">
            {reports.length === 0 && (
              <div className="rounded-[26px] border border-dashed border-line p-10 text-center">
                <ShieldCheck className="mx-auto size-8 text-fresh-ink" />
                <p className="mt-2 font-semibold">No reports yet</p>
                <p className="text-sm text-muted">Customers can report a profile from the bottom of any restaurant page.</p>
              </div>
            )}
            {reports.map((rep) => (
              <div key={rep.id} className={cn("flex items-center gap-3 rounded-[22px] border border-line bg-card p-4", rep.resolved_at && "opacity-50")}>
                <Flag className={cn("size-5 shrink-0", rep.resolved_at ? "text-muted" : "text-stale")} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{rep.reason}</p>
                  <p className="text-xs text-muted">
                    {rep.restaurants ? (
                      <Link href={`/r/${rep.restaurants.slug}`} className="underline">
                        {rep.restaurants.name}
                      </Link>
                    ) : (
                      "Unknown restaurant"
                    )}{" "}
                    · {timeAgo(Date.parse(rep.created_at), now)}
                  </p>
                </div>
                {!rep.resolved_at && (
                  <SmallBtn busy={pending === `r-${rep.id}`} onClick={() => act(`r-${rep.id}`, { type: "report", reportId: rep.id })}>
                    Mark resolved
                  </SmallBtn>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number | string; tone?: "fresh" | "aging" | "stale" }) {
  return (
    <div
      className={cn(
        "rounded-[22px] p-4",
        tone === "fresh" && "bg-fresh/10",
        tone === "aging" && "bg-aging/15",
        tone === "stale" && "bg-stale/10",
        !tone && "border border-line bg-card",
      )}
    >
      <p className="font-display text-3xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: RestaurantStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        status === "live" && "bg-fresh/12 text-fresh-ink",
        status === "draft" && "bg-aging/15 text-aging-ink",
        status === "suspended" && "bg-stale/12 text-stale",
      )}
    >
      {status}
    </span>
  );
}

function SmallBtn({
  children,
  onClick,
  icon,
  busy,
  tone = "ghost",
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  busy?: boolean;
  tone?: "ghost" | "fresh" | "stale";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50",
        tone === "ghost" && "border border-line bg-card hover:bg-paper",
        tone === "fresh" && "bg-fresh text-white",
        tone === "stale" && "bg-stale/10 text-stale hover:bg-stale/20",
        className,
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
