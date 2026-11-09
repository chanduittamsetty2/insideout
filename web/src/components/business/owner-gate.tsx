"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Stats } from "@/lib/types";
import { Splash } from "../ui";

/** Sends signed-out visitors to login, and owners without a restaurant to onboarding. */
export function OwnerGate({ children }: { children: React.ReactNode }) {
  const { ready, user, owner } = useStore();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/business/login?next=${encodeURIComponent(path)}`);
  }, [ready, user, router, path]);

  if (!ready || !user) return <Splash />;
  if (!owner)
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="text-5xl">🍳</p>
          <p className="mt-3 font-display text-2xl font-bold">No restaurant on this account yet</p>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <Link href="/business/onboarding" className="mt-5 inline-block rounded-full bg-ink px-5 py-3 font-bold text-white">
            List your restaurant
          </Link>
        </div>
      </div>
    );
  return <>{children}</>;
}

export function useOwnerStats(restaurantId: string | undefined, everyMs = 15_000): Stats | null {
  const { fetchStats } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (!restaurantId) return;
    let alive = true;
    const load = () => fetchStats(restaurantId).then((s) => alive && s && setStats(s));
    load();
    const t = setInterval(load, everyMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [restaurantId, fetchStats, everyMs]);
  return stats;
}
