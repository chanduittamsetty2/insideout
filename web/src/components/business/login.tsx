"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Rocket, Shield, Store } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { DEMO_ADMIN, DEMO_OWNER } from "@/lib/demo";
import { cn } from "@/lib/format";
import { Button, Field, Logo, Splash, inputCls } from "../ui";

type Mode = "login" | "signup";

export function Login() {
  const { ready, user, refresh, signOut } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function signIn(e: string, p: string, label: string, fallback?: string) {
    setBusy(label);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
      await refresh();
      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/")) return router.push(next);
      if (fallback) return router.push(fallback);
      const { data: member } = await supabase
        .from("restaurant_members")
        .select("restaurant_id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();
      router.push(member ? "/business/dashboard" : "/business/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setBusy(null);
    }
  }

  async function signUp(e: string, p: string, label: string) {
    setBusy(label);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not create account");
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "Could not create account");
      return;
    }
    await signIn(e, p, label, "/business/onboarding");
  }

  async function demoSignIn(account: typeof DEMO_OWNER, label: string, fallback: string) {
    const { error } = await supabase.auth.signInWithPassword(account);
    if (error) {
      setBusy(label);
      await fetch("/api/demo/reset", { method: "POST" });
    }
    await signIn(account.email, account.password, label, fallback);
  }

  const freshAccount = () => {
    const tag = Math.random().toString(36).slice(2, 8);
    return signUp(`demo+${tag}@insideout.app`, `demo-${tag}-${Date.now()}`, "fresh");
  };

  if (!ready) return <Splash />;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pt-5 pb-16">
      <div className="flex items-center justify-between">
        <Link href="/business" className="grid size-10 place-items-center rounded-full bg-card" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <Logo />
        <span className="size-10" />
      </div>

      {user ? (
        <div className="mt-16 animate-rise text-center">
          <p className="text-5xl">👋</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold">You&apos;re signed in</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <div className="mt-6 grid gap-2">
            <Button onClick={() => router.push("/business/dashboard")}>Go to dashboard</Button>
            <Button variant="ghost" onClick={() => signOut()}>
              Log out
            </Button>
          </div>
        </div>
      ) : (
        <div className="animate-rise">
          <h1 className="mt-10 font-display text-[40px] leading-[0.95] font-extrabold tracking-tight">
            {mode === "login" ? "Welcome back, chef." : "Let's get you listed."}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {mode === "login" ? "Log in to update your restaurant." : "Create your restaurant account. Takes 10 seconds."}
          </p>

          <div className="mt-6 flex rounded-full bg-ink/5 p-1 text-sm font-semibold">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn("flex-1 rounded-full py-2 transition", mode === m ? "bg-card shadow-sm" : "text-muted")}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const clean = email.trim().toLowerCase();
              if (mode === "login") signIn(clean, password, "form");
              else signUp(clean, password, "form");
            }}
          >
            <Field label="Email">
              <input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" />
            </Field>
            <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
              <input
                className={inputCls}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="rounded-2xl bg-stale/10 px-3 py-2 text-sm font-semibold text-stale">{error}</p>}
            <Button type="submit" className="w-full py-4" disabled={!email || password.length < (mode === "signup" ? 8 : 1) || !!busy}>
              {busy === "form" ? <Loader2 className="size-5 animate-spin" /> : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <div className="mt-10 rounded-[26px] border-2 border-dashed border-line p-4">
            <p className="text-[11px] font-bold tracking-widest text-grape uppercase">Demo shortcuts</p>
            <div className="mt-3 grid gap-2">
              <DemoButton
                icon={<Store className="size-4" />}
                title="Demo restaurant owner"
                sub="Nizam's Table · dashboard, uploads, QR"
                busy={busy === "owner"}
                onClick={() => demoSignIn(DEMO_OWNER, "owner", "/business/dashboard")}
              />
              <DemoButton
                icon={<Rocket className="size-4" />}
                title="Fresh account"
                sub="Walk through onboarding from scratch"
                busy={busy === "fresh"}
                onClick={freshAccount}
              />
              <DemoButton
                icon={<Shield className="size-4" />}
                title="InsideOut admin"
                sub="Verify FSSAI, moderate photos, reports"
                busy={busy === "admin"}
                onClick={() => demoSignIn(DEMO_ADMIN, "admin", "/admin")}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DemoButton({ icon, title, sub, busy, onClick }: { icon: React.ReactNode; title: string; sub: string; busy: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={busy} className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left transition hover:bg-lime/40 disabled:opacity-60">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">{busy ? <Loader2 className="size-4 animate-spin" /> : icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}
