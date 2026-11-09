"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { areaByName, distanceKm } from "./areas";
import { RESTAURANT_SELECT, toRestaurant, type RestaurantRow } from "./db";
import { DAY } from "./freshness";
import { compressPhoto, extFor } from "./image";
import { MEDIA_BUCKET, authHeader, supabase } from "./supabase";
import type { MediaKind, Post, Restaurant, SectionKey, Stats } from "./types";

const PREFS_KEY = "insideout:prefs";

type EventKind = "profile_view" | "kitchen_view" | "qr_scan";

interface StoreValue {
  ready: boolean;
  now: number;
  offsetDays: number;
  area: string;
  user: User | null;
  isAdmin: boolean;
  /** Live restaurants, with distance from the selected area */
  restaurants: Restaurant[];
  owner: Restaurant | undefined;
  bySlug: (slug: string) => Restaurant | undefined;
  refresh: () => Promise<void>;
  fetchStats: (restaurantId: string) => Promise<Stats | null>;
  uploadMedia: (restaurantId: string, section: SectionKey, blob: Blob, kind: MediaKind, caption?: string) => Promise<string>;
  setSpecial: (restaurantId: string, s: { name: string; price: number; note?: string; imagePath?: string }) => Promise<void>;
  addPost: (restaurantId: string, p: Omit<Post, "id" | "postedAt">) => Promise<void>;
  track: (restaurantId: string, kind: EventKind, source?: string) => void;
  setArea: (area: string) => void;
  setOffsetDays: (days: number) => void;
  resetDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const h = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function loadPrefs(): { area: string; offsetDays: number } {
  try {
    return { area: "Secunderabad", offsetDays: 0, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return { area: "Secunderabad", offsetDays: 0 };
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Restaurant[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ area: "Secunderabad", offsetDays: 0 });
  const [clock, setClock] = useState(0);
  const [booted, setBooted] = useState(false);
  const userRef = useRef<User | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("restaurants").select(RESTAURANT_SELECT);
    if (error) {
      console.error("Could not load restaurants", error);
      setRows((prev) => prev ?? []);
      return;
    }
    setRows((data as unknown as RestaurantRow[]).map(toRestaurant));
  }, []);

  const loadAccount = useCallback(async (u: User | null) => {
    userRef.current = u;
    if (!u) {
      setUser(null);
      setIsAdmin(false);
      setOwnerId(null);
      return;
    }
    const [{ data: adminRow }, { data: member }] = await Promise.all([
      supabase.from("app_admins").select("user_id").eq("user_id", u.id).maybeSingle(),
      supabase.from("restaurant_members").select("restaurant_id").eq("user_id", u.id).limit(1).maybeSingle(),
    ]);
    setIsAdmin(!!adminRow);
    setOwnerId(member?.restaurant_id ?? null);
    setUser(u);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setPrefs(loadPrefs());
      setClock(Date.now());
    });
    const tick = setInterval(() => setClock(Date.now()), 30_000);

    supabase.auth.getSession().then(async ({ data }) => {
      await Promise.all([loadAccount(data.session?.user ?? null), refresh()]);
      setBooted(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if ((session?.user?.id ?? null) !== (userRef.current?.id ?? null)) {
          loadAccount(session?.user ?? null).then(refresh);
        }
      }
    });

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const poll = setInterval(refresh, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
  }, [refresh, loadAccount]);

  const savePrefs = useCallback((patch: Partial<typeof prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const now = clock + prefs.offsetDays * DAY;

  const value = useMemo<StoreValue>(() => {
    const origin = areaByName(prefs.area);
    const all = (rows ?? []).map((r) => ({
      ...r,
      distanceKm: r.lat != null && r.lng != null ? Math.round(distanceKm(origin, { lat: r.lat, lng: r.lng }) * 10) / 10 : 0,
    }));

    return {
      ready: booted && rows !== null && clock > 0,
      now,
      offsetDays: prefs.offsetDays,
      area: prefs.area,
      user,
      isAdmin,
      restaurants: all.filter((r) => r.status === "live"),
      owner: all.find((r) => r.id === ownerId),
      bySlug: (slug) => all.find((r) => r.slug === slug),
      refresh: async () => {
        await loadAccount(userRef.current);
        await refresh();
      },

      fetchStats: async (restaurantId) => {
        const { data } = await supabase.rpc("restaurant_stats", { rid: restaurantId });
        return (data as Stats | null) ?? null;
      },

      uploadMedia: async (restaurantId, section, blob, kind, caption) => {
        const file = kind === "photo" ? await compressPhoto(blob) : blob;
        const type = file.type || (kind === "photo" ? "image/jpeg" : "video/mp4");
        const path = `${restaurantId}/${section}-${newId()}.${extFor(type)}`;
        const up = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: type, upsert: false });
        if (up.error) throw new Error(up.error.message);
        const ins = await supabase.from("media").insert({ restaurant_id: restaurantId, section, kind, storage_path: path, caption: caption ?? null });
        if (ins.error) throw new Error(ins.error.message);
        if (prefs.offsetDays) savePrefs({ offsetDays: 0 });
        await refresh();
        return path;
      },

      setSpecial: async (restaurantId, s) => {
        const { error } = await supabase.from("specials").insert({
          restaurant_id: restaurantId,
          name: s.name,
          price: s.price,
          note: s.note ?? null,
          image_path: s.imagePath ?? null,
        });
        if (error) throw new Error(error.message);
        await refresh();
      },

      addPost: async (restaurantId, p) => {
        const { error } = await supabase.from("posts").insert({ restaurant_id: restaurantId, kind: p.kind, title: p.title, detail: p.detail ?? null });
        if (error) throw new Error(error.message);
        await refresh();
      },

      track: (restaurantId, kind, source) => {
        supabase
          .from("view_events")
          .insert({ restaurant_id: restaurantId, kind, source: source ?? null })
          .then(({ error }) => error && console.warn("track failed", error.message));
      },

      setArea: (area) => savePrefs({ area }),
      setOffsetDays: (days) => savePrefs({ offsetDays: days }),

      resetDemo: async () => {
        const res = await fetch("/api/demo/reset", { method: "POST", headers: await authHeader() });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Reset failed");
        savePrefs({ offsetDays: 0 });
        await refresh();
      },

      signOut: async () => {
        await supabase.auth.signOut();
        await loadAccount(null);
        await refresh();
      },
    };
  }, [booted, rows, clock, now, prefs, user, isAdmin, ownerId, refresh, loadAccount, savePrefs]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
