"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, RotateCcw, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/format";

const JUMPS = [
  { days: 0, label: "Today" },
  { days: 3, label: "+3 days" },
  { days: 7, label: "+7 days" },
  { days: 30, label: "+30 days" },
];

const LINKS = [
  { href: "/", label: "📱 Customer app" },
  { href: "/r/nizams-table", label: "⭐ Restaurant profile" },
  { href: "/business", label: "💼 For restaurants" },
  { href: "/business/onboarding", label: "🚀 Onboarding" },
  { href: "/business/dashboard", label: "📊 Owner dashboard" },
  { href: "/business/qr", label: "🔳 QR kit" },
];

export function DemoBar() {
  const { ready, offsetDays, setOffsetDays, reset } = useStore();
  const [open, setOpen] = useState(false);
  if (!ready) return null;

  return (
    <div className="no-print fixed top-1/2 right-0 z-40 -translate-y-1/2">
      {open ? (
        <div className="mr-3 w-72 animate-pop rounded-3xl bg-ink p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="size-4 text-lime" /> Demo controls
            </p>
            <button onClick={() => setOpen(false)} aria-label="Close demo controls" className="grid size-7 place-items-center rounded-full bg-white/10">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl bg-white/8 px-2.5 py-2 text-xs font-semibold hover:bg-white/15">
                {l.label}
              </Link>
            ))}
          </div>

          <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/60">
            <Clock className="size-3.5" /> Time travel: watch freshness decay
          </p>
          <div className="grid grid-cols-4 gap-1">
            {JUMPS.map((j) => (
              <button
                key={j.days}
                onClick={() => setOffsetDays(j.days)}
                className={cn(
                  "rounded-xl py-2 text-[11px] font-bold transition",
                  offsetDays === j.days ? "bg-lime text-ink" : "bg-white/8 hover:bg-white/15",
                )}
              >
                {j.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => reset()}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
          >
            <RotateCcw className="size-3.5" /> Reset demo data
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1.5 rounded-l-2xl bg-ink px-2 py-3 text-[11px] font-bold text-white shadow-xl transition hover:pr-3"
        >
          <Sparkles className="size-3.5 text-lime" />
          <span className="[writing-mode:vertical-rl]">Demo</span>
          {offsetDays > 0 && <span className="rounded-full bg-lime px-1 text-[10px] text-ink">+{offsetDays}d</span>}
        </button>
      )}
    </div>
  );
}
