"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Logo } from "../ui";

const NAV = [
  { href: "/business/dashboard", label: "Dashboard" },
  { href: "/business/qr", label: "QR kit" },
];

export function BizHeader({ profileSlug }: { profileSlug?: string }) {
  const path = usePathname();
  const router = useRouter();
  const { user, signOut } = useStore();
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
          {user && (
            <button
              onClick={async () => {
                await signOut();
                router.push("/business/login");
              }}
              title={`Log out ${user.email}`}
              className="ml-1 grid size-9 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
              aria-label="Log out"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
