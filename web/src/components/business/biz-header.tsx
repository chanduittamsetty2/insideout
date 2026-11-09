"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { Logo } from "../ui";

const NAV = [
  { href: "/business/dashboard", label: "Dashboard" },
  { href: "/business/qr", label: "QR kit" },
];

export function BizHeader({ profileSlug }: { profileSlug?: string }) {
  const path = usePathname();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line/60 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
        <Link href="/business" className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Business</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("rounded-full px-3 py-1.5 transition", path === n.href ? "bg-ink text-white" : "text-muted hover:text-ink")}
            >
              {n.label}
            </Link>
          ))}
          {profileSlug && (
            <Link href={`/r/${profileSlug}`} className="hidden rounded-full px-3 py-1.5 text-muted hover:text-ink sm:block">
              Live profile ↗
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
