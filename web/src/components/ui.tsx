"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LEVEL_STYLE, freshLabel, freshLevel } from "@/lib/freshness";
import { cn } from "@/lib/format";
import type { MediaKind } from "@/lib/types";

export function Logo({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <span className={cn("font-display text-[22px] font-extrabold tracking-tight lowercase", className)}>
      <span className={invert ? "text-white" : "text-ink"}>inside</span>
      <span className="ml-0.5 inline-block -rotate-3 rounded-md bg-lime px-1.5 text-ink">out</span>
    </span>
  );
}

export function FreshDot({ ts, now, className }: { ts?: number; now: number; className?: string }) {
  const level = freshLevel(ts, now);
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        LEVEL_STYLE[level].dot,
        level === "fresh" && "animate-pulse-dot text-fresh",
        className,
      )}
    />
  );
}

export function FreshChip({ ts, now, prefix, className }: { ts?: number; now: number; prefix?: string; className?: string }) {
  const level = freshLevel(ts, now);
  const label = freshLabel(ts, now);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        LEVEL_STYLE[level].chip,
        className,
      )}
    >
      <FreshDot ts={ts} now={now} />
      {prefix ? `${prefix} · ${label.replace(/^Updated /, "")}` : label}
    </span>
  );
}

export function Media({
  src,
  kind = "photo",
  alt = "",
  className,
  controls,
  autoPlay,
  onEnded,
}: {
  src?: string;
  kind?: MediaKind;
  alt?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  onEnded?: () => void;
}) {
  const resolved = src;
  const [failed, setFailed] = useState<string | null>(null);

  if (!resolved || failed === resolved) {
    return <div className={cn("bg-gradient-to-br from-[#ebe4d8] to-[#d9cfbf]", className)} />;
  }
  if (kind === "video") {
    return (
      <video
        src={resolved}
        className={cn("object-cover", className)}
        playsInline
        muted
        autoPlay={autoPlay}
        loop={!onEnded && autoPlay}
        controls={controls}
        onEnded={onEnded}
        onError={() => setFailed(resolved)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={cn("object-cover", className)} onError={() => setFailed(resolved)} />
  );
}

export function ScoreRing({ score, size = 64, stroke = 7, className }: { score: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--color-fresh)" : score >= 40 ? "var(--color-aging)" : "var(--color-stale)";
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className="absolute font-display font-extrabold" style={{ fontSize: size * 0.28 }}>
        {score}
      </span>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md animate-rise rounded-t-[28px] bg-card p-5 pb-8 shadow-2xl sm:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-paper" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="animate-pop text-center">
        <Logo className="text-3xl" />
        <p className="mt-2 text-sm text-muted">peeking inside…</p>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, group }: { label: string; children: React.ReactNode; hint?: string; group?: boolean }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block" role={group ? "group" : undefined} aria-label={group ? label : undefined}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </Tag>
  );
}

export const inputCls =
  "w-full rounded-2xl border border-line bg-card px-4 py-3 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-4 focus:ring-lime/60";

export function Button({
  children,
  variant = "ink",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ink" | "lime" | "ghost" }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-bold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variant === "ink" && "bg-ink text-white hover:bg-ink/90",
        variant === "lime" && "bg-lime text-ink hover:brightness-95",
        variant === "ghost" && "border border-line bg-card text-ink hover:bg-paper",
        className,
      )}
    >
      {children}
    </button>
  );
}
