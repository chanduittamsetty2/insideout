import { admin, isAdminUser, json, userFromRequest } from "@/lib/supabase-admin";

type Action =
  | { type: "fssai"; restaurantId: string; verified: boolean }
  | { type: "status"; restaurantId: string; status: "live" | "suspended" | "draft" }
  | { type: "media"; mediaId: string; review: "approved" | "rejected" }
  | { type: "report"; reportId: string };

export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user || !(await isAdminUser(user.id))) return json({ error: "Admins only" }, 403);

  const a = (await req.json().catch(() => null)) as Action | null;
  if (!a) return json({ error: "Bad request" }, 400);

  let error: { message: string } | null = null;
  switch (a.type) {
    case "fssai":
      ({ error } = await admin
        .from("fssai_licenses")
        .update(a.verified ? { verified_at: new Date().toISOString(), verified_by: user.id } : { verified_at: null, verified_by: null })
        .eq("restaurant_id", a.restaurantId));
      break;
    case "status":
      if (!["live", "suspended", "draft"].includes(a.status)) return json({ error: "Bad status" }, 400);
      ({ error } = await admin.from("restaurants").update({ status: a.status }).eq("id", a.restaurantId));
      break;
    case "media":
      if (!["approved", "rejected"].includes(a.review)) return json({ error: "Bad review" }, 400);
      ({ error } = await admin.from("media").update({ review: a.review }).eq("id", a.mediaId));
      break;
    case "report":
      ({ error } = await admin.from("reports").update({ resolved_at: new Date().toISOString() }).eq("id", a.reportId));
      break;
    default:
      return json({ error: "Unknown action" }, 400);
  }
  return error ? json({ error: error.message }, 400) : json({ ok: true });
}
