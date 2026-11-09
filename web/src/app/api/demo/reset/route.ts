import { createHash } from "node:crypto";
import { areaByName } from "@/lib/areas";
import { DEMO_ADMIN, DEMO_OWNER } from "@/lib/demo";
import { OWNER_DEMO_ID, seedRestaurants } from "@/lib/seed";
import { admin, json } from "@/lib/supabase-admin";

let lastReset = 0;

function stableId(seed: string): string {
  const h = createHash("sha1").update(`insideout-demo:${seed}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function ensureUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = data.users.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password });
    return found.id;
  }
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  return created.data.user.id;
}

async function clearFolders(ids: string[]) {
  for (const bucket of ["media", "documents"]) {
    for (const id of ids) {
      const { data } = await admin.storage.from(bucket).list(id, { limit: 1000 });
      if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${id}/${f.name}`));
    }
  }
}

const must = <T extends { error: { message: string } | null }>(res: T, what: string): T => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res;
};

/** Wipes the demo restaurants (and anything the demo account created) and seeds them fresh. */
export async function POST() {
  if (Date.now() - lastReset < 10_000) return json({ ok: true, skipped: true });
  lastReset = Date.now();

  try {
    const [ownerId, adminId] = await Promise.all([
      ensureUser(DEMO_OWNER.email, DEMO_OWNER.password),
      ensureUser(DEMO_ADMIN.email, DEMO_ADMIN.password),
    ]);
    must(await admin.from("app_admins").upsert({ user_id: adminId }), "admin");

    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const throwaway = (list?.users ?? []).filter((u) => /^demo\+[a-z0-9]+@insideout\.app$/.test(u.email ?? "")).map((u) => u.id);

    const demo = must(await admin.from("restaurants").select("id").eq("is_demo", true), "list demo");
    const owned = must(await admin.from("restaurant_members").select("restaurant_id").in("user_id", [ownerId, ...throwaway]), "list owned");
    const oldIds = [...new Set([...(demo.data ?? []).map((r) => r.id), ...(owned.data ?? []).map((m) => m.restaurant_id)])];
    if (oldIds.length) {
      await clearFolders(oldIds);
      must(await admin.from("restaurants").delete().in("id", oldIds), "delete");
    }
    for (const id of throwaway) await admin.auth.admin.deleteUser(id);

    const now = Date.now();
    const iso = (t: number) => new Date(t).toISOString();
    const seeds = seedRestaurants(now);
    const idOf = new Map(seeds.map((s) => [s.slug, stableId(s.slug)]));

    must(
      await admin.from("restaurants").insert(
        seeds.map((s, i) => {
          const c = areaByName(s.area);
          return {
            id: idOf.get(s.slug),
            slug: s.slug,
            name: s.name,
            tagline: s.tagline,
            cuisines: s.cuisines,
            area: s.area,
            address: s.address,
            phone: s.phone,
            lat: c.lat + ((i % 3) - 1) * 0.004,
            lng: c.lng + ((i % 2) - 0.5) * 0.006,
            opens_at: s.hours.open,
            closes_at: s.hours.close,
            price_for_two: s.priceForTwo,
            is_veg: s.isVeg,
            sections: s.sections,
            google_rating: s.google?.rating ?? null,
            google_rating_count: s.google?.count ?? null,
            google_maps_url: s.google?.mapsUrl ?? null,
            google_synced_at: iso(now),
            swiggy_url: s.links.swiggy ?? null,
            zomato_url: s.links.zomato ?? null,
            cover_path: s.cover,
            status: "live",
            is_demo: true,
            stats_baseline: { ...s.stats, reviews: Math.max(0, s.stats.reviews - s.reviews.length) },
            created_at: iso(s.createdAt),
          };
        }),
      ),
      "restaurants",
    );

    const rows = <T>(f: (s: (typeof seeds)[number], rid: string) => T[]) => seeds.flatMap((s) => f(s, idOf.get(s.slug)!));

    const fssai = rows((s, rid) =>
      s.fssai
        ? [{
            restaurant_id: rid,
            license_number: s.fssai.number,
            license_type: s.fssai.type,
            valid_till: s.fssai.validTill,
            verified_at: s.fssai.verified ? iso(now - 60 * 86_400_000) : null,
            verified_by: s.fssai.verified ? adminId : null,
          }]
        : [],
    );
    const media = rows((s, rid) =>
      s.media.map((m) => ({
        restaurant_id: rid,
        section: m.section,
        kind: m.kind,
        storage_path: m.src,
        caption: m.caption ?? null,
        captured_at: iso(m.capturedAt),
        uploaded_by: null,
      })),
    );
    const specials = rows((s, rid) =>
      s.special
        ? [{ restaurant_id: rid, name: s.special.name, price: s.special.price, note: s.special.note ?? null, image_path: s.special.image ?? null, posted_at: iso(s.special.postedAt) }]
        : [],
    );
    const posts = rows((s, rid) =>
      s.posts.map((p) => ({ restaurant_id: rid, kind: p.kind, title: p.title, detail: p.detail ?? null, posted_at: iso(p.postedAt) })),
    );
    const reviews = rows((s, rid) =>
      s.reviews.map((r) => ({ restaurant_id: rid, author_name: r.author, rating: r.rating, body: r.text, created_at: iso(r.at) })),
    );

    must(await admin.from("fssai_licenses").insert(fssai), "fssai");
    must(await admin.from("media").insert(media), "media");
    if (specials.length) must(await admin.from("specials").insert(specials), "specials");
    if (posts.length) must(await admin.from("posts").insert(posts), "posts");
    if (reviews.length) must(await admin.from("reviews").insert(reviews), "reviews");
    must(
      await admin.from("restaurant_members").insert({ restaurant_id: idOf.get(OWNER_DEMO_ID), user_id: ownerId, role: "owner" }),
      "membership",
    );

    return json({ ok: true, restaurants: seeds.length });
  } catch (e) {
    lastReset = 0;
    console.error("Demo reset failed", e);
    return json({ error: e instanceof Error ? e.message : "Reset failed" }, 500);
  }
}
