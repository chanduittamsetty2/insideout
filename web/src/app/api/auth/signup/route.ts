import { admin, json } from "@/lib/supabase-admin";

// Accounts are created server-side and pre-confirmed, so no emails are sent.
export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const cleanEmail = email?.trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return json({ error: "Enter a valid email" }, 400);
  if (!password || password.length < 8) return json({ error: "Password needs at least 8 characters" }, 400);

  const { error } = await admin.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return json({ error: taken ? "This email already has an account. Log in instead." : error.message }, taken ? 409 : 400);
  }
  return json({ ok: true });
}
