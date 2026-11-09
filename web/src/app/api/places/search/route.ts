import { nearestArea } from "@/lib/areas";
import { json, userFromRequest } from "@/lib/supabase-admin";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  area: string;
  rating: number | null;
  count: number;
  mapsUrl: string;
  phone: string;
  hours: { open: string; close: string } | null;
}

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours",
].join(",");

const HYDERABAD = { latitude: 17.385, longitude: 78.4867 };

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { periods?: { open?: { hour?: number; minute?: number }; close?: { hour?: number; minute?: number } }[] };
}

const hhmm = (t?: { hour?: number; minute?: number }) =>
  t ? `${String(t.hour ?? 0).padStart(2, "0")}:${String(t.minute ?? 0).padStart(2, "0")}` : null;

/** Exactly one Google call per search: the owner presses Search, we call Text Search once. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return json({ error: "Log in first" }, 401);

  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  const q = query?.trim() ?? "";
  if (q.length < 3) return json({ error: "Type at least 3 letters" }, 400);

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return json({ results: [], unavailable: true });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
      body: JSON.stringify({
        textQuery: /hyderabad|secunderabad/i.test(q) ? q : `${q} Hyderabad`,
        maxResultCount: 5,
        regionCode: "IN",
        locationBias: { circle: { center: HYDERABAD, radius: 30000 } },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("Places search failed", res.status, (await res.text()).slice(0, 300));
      return json({ results: [], unavailable: true });
    }
    const data = (await res.json()) as { places?: GooglePlace[] };
    const results: PlaceResult[] = (data.places ?? []).map((p) => {
      const period = p.regularOpeningHours?.periods?.[0];
      const open = hhmm(period?.open);
      const close = hhmm(period?.close);
      const lat = p.location?.latitude ?? null;
      const lng = p.location?.longitude ?? null;
      return {
        placeId: p.id,
        name: p.displayName?.text ?? "Unnamed place",
        address: p.formattedAddress ?? "",
        lat,
        lng,
        area: lat != null && lng != null ? nearestArea(lat, lng) : "Secunderabad",
        rating: p.rating ?? null,
        count: p.userRatingCount ?? 0,
        mapsUrl: p.googleMapsUri ?? "",
        phone: p.nationalPhoneNumber ?? "",
        hours: open && close ? { open, close } : null,
      };
    });
    return json({ results });
  } catch (e) {
    console.warn("Places search error", e);
    return json({ results: [], unavailable: true });
  }
}
