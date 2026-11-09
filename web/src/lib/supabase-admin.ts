import "server-only";
import { createClient, type User } from "@supabase/supabase-js";

export const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
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
