import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

/** Created on first use so builds don't need the secret key. */
export const admin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export async function userFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await admin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
