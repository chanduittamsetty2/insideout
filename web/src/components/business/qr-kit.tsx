"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/format";
import { Button, Logo } from "../ui";
import { BizHeader } from "./biz-header";
import { OwnerGate, useOwnerStats } from "./owner-gate";

const PLACEMENTS = [
  { key: "table", label: "Table", emoji: "🪑", headline: "Peek inside our kitchen 👀" },
  { key: "counter", label: "Counter", emoji: "🧾", headline: "See where your food is made" },
  { key: "menu", label: "Menu", emoji: "📖", headline: "Before you order, look inside" },
  { key: "receipt", label: "Receipt", emoji: "🧾", headline: "Loved it? See the kitchen behind it" },
  { key: "entrance", label: "Entrance", emoji: "🚪", headline: "Our kitchen has nothing to hide" },
] as const;

export function QrKit() {
  return (
    <OwnerGate>
      <QrKitInner />
    </OwnerGate>
  );
}

function QrKitInner() {
  const { owner } = useStore();
  const r = owner!;
  const stats = useOwnerStats(r.id);
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]>(PLACEMENTS[0]);
  const [copied, setCopied] = useState(false);

  const base = `${window.location.origin}/r/${r.slug}`;
  const url = `${base}?src=${placement.key}`;

  return (
    <div className="min-h-dvh pb-24">
      <BizHeader profileSlug={r.slug} />
      <main className="mx-auto max-w-5xl px-5 pt-6">
        <div className="no-print">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Your QR kit</h1>
          <p className="mt-1 text-muted">One QR per spot, so you can see which placement gets the most scans.</p>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
            {PLACEMENTS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlacement(p)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
                  placement.key === p.key ? "border-ink bg-ink text-white" : "border-line bg-card",
                )}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid items-start gap-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto w-[320px] overflow-hidden rounded-[36px] bg-ink text-white shadow-2xl print:shadow-none">
            <div className="p-7 text-center">
              <Logo invert className="text-xl" />
              <p className="mt-5 font-display text-[28px] leading-[1.02] font-extrabold tracking-tight">{placement.headline}</p>
              <div className="mx-auto mt-6 w-fit rounded-[28px] bg-white p-4">
                <QRCodeSVG value={url} size={200} level="M" />
              </div>
              <p className="mt-5 font-display text-lg font-bold">{r.name}</p>
              <p className="mt-1 text-xs text-white/60">Scan to see live, time-stamped photos of our kitchen, fridge & food.</p>
            </div>
            <div className="bg-lime px-5 py-3 text-center text-xs font-bold text-ink">No app needed · Just scan with your camera</div>
          </div>

          <div className="no-print space-y-4">
            <div className="rounded-[26px] border border-line bg-card p-5">
              <p className="text-sm font-semibold text-muted">Link for this QR</p>
              <p className="mt-1 font-mono text-sm break-all">{url}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => window.print()}>
                  <Printer className="size-4" /> Print
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <Copy className="size-4" /> {copied ? "Copied!" : "Copy link"}
                </Button>
              </div>
            </div>
            <div className="rounded-[26px] bg-lime/40 p-5">
              <p className="font-display text-lg font-bold">Where to put it</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink/80">
                <li>🪑 On every table, where people wait for food</li>
                <li>🧾 At the billing counter</li>
                <li>📖 Inside the menu card</li>
                <li>🧾 Printed on receipts and delivery bags</li>
                <li>🚪 At the entrance, for people deciding to walk in</li>
              </ul>
            </div>
            <div className="rounded-[26px] border border-line bg-card p-5">
              <p className="text-sm font-semibold text-muted">Total QR scans</p>
              <p className="font-display text-4xl font-extrabold">{stats ? stats.qrScans.toLocaleString("en-IN") : "…"}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
