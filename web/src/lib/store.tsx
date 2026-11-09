"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DAY } from "./freshness";
import { clearBlobs, putBlob } from "./media-db";
import { OWNER_DEMO_ID, seedRestaurants } from "./seed";
import type { Media, MediaKind, Post, Restaurant, SectionKey, Special } from "./types";

const KEY = "insideout:v1";

interface Persisted {
  restaurants: Restaurant[];
  offsetDays: number;
  ownerId: string;
}

type StatKey = keyof Restaurant["stats"];

export type NewRestaurantInput = Omit<Restaurant, "id" | "slug" | "stats" | "posts" | "reviews" | "createdAt" | "distanceKm">;

interface StoreValue {
  ready: boolean;
  now: number;
  offsetDays: number;
  restaurants: Restaurant[];
  owner: Restaurant | undefined;
  bySlug: (slug: string) => Restaurant | undefined;
  saveCapture: (section: SectionKey, blob: Blob, kind: MediaKind, caption?: string) => Promise<Media>;
  addMedia: (restaurantId: string, media: Media) => void;
  setSpecial: (restaurantId: string, special: Omit<Special, "id" | "postedAt">) => void;
  addPost: (restaurantId: string, post: Omit<Post, "id" | "postedAt">) => void;
  bump: (restaurantId: string, key: StatKey) => void;
  createRestaurant: (input: NewRestaurantInput) => Restaurant;
  setOffsetDays: (days: number) => void;
  reset: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "restaurant";

function fresh(): Persisted {
  return { restaurants: seedRestaurants(Date.now()), offsetDays: 0, ownerId: OWNER_DEMO_ID };
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function save(d: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    console.warn("InsideOut demo: could not persist state", e);
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Persisted | null>(null);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      const initial = load() ?? fresh();
      save(initial);
      setData(initial);
      setClock(Date.now());
    });
    const tick = setInterval(() => setClock(Date.now()), 30_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setData(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(tick);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const offsetDays = data?.offsetDays ?? 0;
  const now = clock + offsetDays * DAY;
  const nowRef = useRef(now);
  useEffect(() => {
    nowRef.current = now;
  }, [now]);

  const update = useCallback((fn: (d: Persisted) => Persisted) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const patchRestaurant = useCallback(
    (id: string, fn: (r: Restaurant) => Restaurant) =>
      update((d) => ({ ...d, restaurants: d.restaurants.map((r) => (r.id === id ? fn(r) : r)) })),
    [update],
  );

  const value = useMemo<StoreValue>(() => {
    const restaurants = data?.restaurants ?? [];
    return {
      ready: data !== null,
      now,
      offsetDays,
      restaurants,
      owner: restaurants.find((r) => r.id === data?.ownerId),
      bySlug: (slug) => restaurants.find((r) => r.slug === slug),

      saveCapture: async (section, blob, kind, caption) => {
        const id = uid();
        await putBlob(id, blob);
        return { id, section, kind, src: `idb:${id}`, capturedAt: Date.now() + (data?.offsetDays ?? 0) * DAY, caption };
      },

      addMedia: (restaurantId, media) => patchRestaurant(restaurantId, (r) => ({ ...r, media: [...r.media, media] })),

      setSpecial: (restaurantId, special) =>
        patchRestaurant(restaurantId, (r) => ({ ...r, special: { ...special, id: uid(), postedAt: nowRef.current } })),

      addPost: (restaurantId, post) =>
        patchRestaurant(restaurantId, (r) => ({ ...r, posts: [{ ...post, id: uid(), postedAt: nowRef.current }, ...r.posts] })),

      bump: (restaurantId, key) =>
        patchRestaurant(restaurantId, (r) => ({ ...r, stats: { ...r.stats, [key]: r.stats[key] + 1 } })),

      createRestaurant: (input) => {
        const taken = new Set(restaurants.map((r) => r.slug));
        let slug = slugify(input.name);
        for (let n = 2; taken.has(slug); n++) slug = `${slugify(input.name)}-${n}`;
        const created: Restaurant = {
          ...input,
          id: slug,
          slug,
          distanceKm: 0.8,
          posts: [],
          reviews: [],
          stats: { profileViews: 0, kitchenViews: 0, qrScans: 0, reviews: 0 },
          createdAt: nowRef.current,
        };
        update((d) => ({ ...d, ownerId: created.id, restaurants: [created, ...d.restaurants.filter((r) => r.id !== created.id)] }));
        return created;
      },

      setOffsetDays: (days) => update((d) => ({ ...d, offsetDays: days })),

      reset: async () => {
        await clearBlobs().catch(() => {});
        const next = fresh();
        save(next);
        setData(next);
        setClock(Date.now());
      },
    };
  }, [data, now, offsetDays, patchRestaurant, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
