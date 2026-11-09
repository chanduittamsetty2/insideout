import { publicUrl } from "./supabase";
import { latestBySection } from "./freshness";
import type { Fssai, Media, Restaurant, RestaurantStatus, SectionKey } from "./types";

export const RESTAURANT_SELECT = "*, fssai_licenses(*), media(*), specials(*), posts(*), reviews(*)";

interface MediaRow {
  id: string;
  section: SectionKey;
  kind: "photo" | "video";
  storage_path: string;
  caption: string | null;
  captured_at: string;
  review: "approved" | "rejected";
}

export interface RestaurantRow {
  id: string;
  slug: string;
  status: RestaurantStatus;
  is_demo: boolean;
  name: string;
  tagline: string | null;
  cuisines: string[];
  area: string;
  address: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  opens_at: string | null;
  closes_at: string | null;
  price_for_two: number | null;
  is_veg: boolean;
  sections: SectionKey[];
  google_rating: number | null;
  google_rating_count: number | null;
  google_maps_url: string | null;
  swiggy_url: string | null;
  zomato_url: string | null;
  cover_path: string | null;
  created_at: string;
  fssai_licenses: {
    license_number: string;
    license_type: Fssai["type"];
    valid_till: string | null;
    verified_at: string | null;
  } | null;
  media: MediaRow[];
  specials: { id: string; name: string; price: number; note: string | null; image_path: string | null; posted_at: string }[];
  posts: { id: string; kind: "offer" | "event"; title: string; detail: string | null; posted_at: string }[];
  reviews: { id: string; author_name: string; rating: number; body: string; created_at: string }[];
}

const ts = (s: string) => new Date(s).getTime();

export const toMedia = (m: MediaRow): Media => ({
  id: m.id,
  section: m.section,
  kind: m.kind,
  src: publicUrl(m.storage_path),
  capturedAt: ts(m.captured_at),
  caption: m.caption ?? undefined,
});

export function toRestaurant(row: RestaurantRow): Restaurant {
  const media = row.media.filter((m) => m.review === "approved").map(toMedia);
  const special = [...row.specials].sort((a, b) => ts(b.posted_at) - ts(a.posted_at))[0];
  const f = row.fssai_licenses;
  const mapsQuery = encodeURIComponent(`${row.name} ${row.address}`);

  const r: Restaurant = {
    id: row.id,
    slug: row.slug,
    status: row.status,
    isDemo: row.is_demo,
    name: row.name,
    tagline: row.tagline ?? "",
    cuisines: row.cuisines,
    area: row.area,
    address: row.address,
    phone: row.phone ?? "",
    lat: row.lat,
    lng: row.lng,
    distanceKm: 0,
    hours: { open: row.opens_at?.slice(0, 5) ?? "11:00", close: row.closes_at?.slice(0, 5) ?? "23:00" },
    priceForTwo: row.price_for_two ?? 500,
    isVeg: row.is_veg,
    google:
      row.google_rating != null
        ? {
            rating: Number(row.google_rating),
            count: row.google_rating_count ?? 0,
            mapsUrl: row.google_maps_url ?? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
          }
        : null,
    links: { swiggy: row.swiggy_url ?? undefined, zomato: row.zomato_url ?? undefined },
    fssai: f
      ? { number: f.license_number, type: f.license_type, validTill: f.valid_till ?? "", verified: !!f.verified_at }
      : null,
    cover: publicUrl(row.cover_path),
    sections: row.sections,
    media,
    special: special
      ? {
          id: special.id,
          name: special.name,
          price: special.price,
          note: special.note ?? undefined,
          image: special.image_path ? publicUrl(special.image_path) : undefined,
          postedAt: ts(special.posted_at),
        }
      : undefined,
    posts: [...row.posts]
      .sort((a, b) => ts(b.posted_at) - ts(a.posted_at))
      .map((p) => ({ id: p.id, kind: p.kind, title: p.title, detail: p.detail ?? undefined, postedAt: ts(p.posted_at) })),
    reviews: [...row.reviews]
      .sort((a, b) => ts(b.created_at) - ts(a.created_at))
      .map((rv) => ({ id: rv.id, author: rv.author_name, rating: rv.rating, text: rv.body, at: ts(rv.created_at) })),
    createdAt: ts(row.created_at),
  };

  if (!r.cover) {
    const latest = latestBySection({ ...r, media: media.filter((m) => m.kind === "photo") });
    r.cover = (latest.food ?? latest.dining ?? latest.kitchen ?? Object.values(latest)[0])?.src ?? "";
  }
  return r;
}
