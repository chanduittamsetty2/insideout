// End-to-end check against a running app + the real database. Usage: npm run smoke [-- http://localhost:3000]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = process.argv[2] ?? "http://localhost:3000";
const client = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

let failed = 0;
const check = (ok, label, extra = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed++;
};
const post = (path, body, token) =>
  fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body ?? {}),
  });

// Owner signs up and onboards
const tag = Math.random().toString(36).slice(2, 8);
const email = `demo+${tag}@insideout.app`;
const password = `smoke-${tag}-pass`;
check((await post("/api/auth/signup", { email, password })).ok, "signup");
const owner = client();
const { data: login, error: loginErr } = await owner.auth.signInWithPassword({ email, password });
check(!loginErr, "login", loginErr?.message);
const token = login.session?.access_token;

const search = await (await post("/api/places/search", { query: "Paradise Biryani Secunderabad" }, token)).json();
check(Array.isArray(search.results), "places search answers", search.unavailable ? "(Google unavailable, manual fallback)" : `${search.results.length} results`);
check((await post("/api/places/search", { query: "Paradise" })).status === 401, "places search needs login");

const id = crypto.randomUUID();
let r = await owner.from("restaurants").insert({ id, slug: `smoke-${tag}`, name: "Smoke Test Kitchen", area: "Ameerpet", address: "Test St", cuisines: ["Biryani"], status: "live", is_demo: true, stats_baseline: { profileViews: 9999 } });
check(!r.error, "create restaurant", r.error?.message);
const { data: row } = await owner.from("restaurants").select("status, is_demo, stats_baseline").eq("id", id).single();
check(row?.status === "draft" && row?.is_demo === false && JSON.stringify(row?.stats_baseline) === "{}", "guard blocks owner from self-publishing/inflating on insert");

r = await owner.from("fssai_licenses").insert({ restaurant_id: id, license_number: "12345678901234", license_type: "State License" });
check(!r.error, "add FSSAI", r.error?.message);
r = await owner.from("fssai_licenses").update({ verified_at: new Date().toISOString() }).eq("restaurant_id", id);
check(!!r.error, "owner cannot self-verify FSSAI");

const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const path = `${id}/kitchen-${tag}.png`;
r = await owner.storage.from("media").upload(path, new Blob([png], { type: "image/png" }), { contentType: "image/png" });
check(!r.error, "upload photo to storage", r.error?.message);
r = await owner.from("media").insert({ restaurant_id: id, section: "kitchen", kind: "photo", storage_path: path, captured_at: "2020-01-01T00:00:00Z" });
check(!r.error, "insert media row", r.error?.message);
const { data: m } = await owner.from("media").select("captured_at").eq("restaurant_id", id).single();
check(m && Date.now() - Date.parse(m.captured_at) < 60_000, "server stamps upload time (backdating ignored)");

const anon = client();
check(((await anon.from("restaurants").select("id").eq("id", id)).data ?? []).length === 0, "draft hidden from public");
r = await owner.from("restaurants").update({ status: "live" }).eq("id", id);
check(!r.error, "publish", r.error?.message);
check(((await anon.from("restaurants").select("id").eq("id", id)).data ?? []).length === 1, "live visible to public");

r = await anon.from("view_events").insert([{ restaurant_id: id, kind: "profile_view" }, { restaurant_id: id, kind: "qr_scan", source: "table" }]);
check(!r.error, "anonymous view + QR tracking", r.error?.message);
const { data: stats } = await owner.rpc("restaurant_stats", { rid: id });
check(stats?.profileViews === 1 && stats?.qrScans === 1, "owner stats", JSON.stringify(stats));
check(!(await anon.rpc("restaurant_stats", { rid: id })).data, "stats private to owner");

r = await anon.from("reports").insert({ restaurant_id: id, reason: "Smoke test report" });
check(!r.error, "anonymous report", r.error?.message);

// Admin
const adm = client();
const { data: al } = await adm.auth.signInWithPassword({ email: "admin@insideout.app", password: "insideout-admin" });
const at = al.session?.access_token;
check(!!at, "admin login");
check((await post("/api/admin/action", { type: "fssai", restaurantId: id, verified: true }, token)).status === 403, "owner can't use admin API");
check((await post("/api/admin/action", { type: "fssai", restaurantId: id, verified: true }, at)).ok, "admin verifies FSSAI");
const { data: f } = await anon.from("fssai_licenses").select("verified_at").eq("restaurant_id", id).single();
check(!!f?.verified_at, "verified badge is public");
const { data: reps } = await adm.from("reports").select("id").eq("restaurant_id", id);
check(reps?.length === 1, "admin sees report");
check((await post("/api/admin/action", { type: "status", restaurantId: id, status: "suspended" }, at)).ok, "admin suspends");
r = await owner.from("restaurants").update({ status: "live" }).eq("id", id);
const { data: after } = await adm.from("restaurants").select("status").eq("id", id).single();
check(after?.status === "suspended", "owner cannot undo suspension");

// Clean up: reset removes demo+ accounts and their restaurants
check((await post("/api/demo/reset")).ok, "demo reset (cleans smoke data)");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
