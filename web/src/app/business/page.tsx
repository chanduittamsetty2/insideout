import Link from "next/link";
import { ArrowRight, BarChart3, Camera, Clock, QrCode, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/ui";

const STEPS = [
  { icon: Camera, title: "Snap", body: "Shoot your kitchen, fridge and food live in the app. Takes 30 seconds." },
  { icon: Clock, title: "Stamped", body: "We record the exact upload time automatically. Nobody can fake it." },
  { icon: QrCode, title: "Shown", body: "Customers scan your QR or find you nearby and see what's inside." },
];

const PERKS = [
  { icon: SlidersHorizontal, title: "You're in control", body: "Choose what to show: kitchen, fridge, storage, specials, offers, events." },
  { icon: BarChart3, title: "See who's peeking", body: "Profile views, kitchen views and QR scans, updated live." },
  { icon: ShieldCheck, title: "Trust that sells", body: "FSSAI details, live photos and fresh time stamps. Proof, not promises." },
];

export default function BusinessLanding() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Business</span>
        </Link>
        <Link href="/business/dashboard" className="text-sm font-semibold text-muted hover:text-ink">
          Log in
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-8 pb-16 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold">
              <span className="size-2 animate-pulse-dot rounded-full bg-fresh text-fresh" /> Now onboarding Hyderabad restaurants
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.92] font-extrabold tracking-tight md:text-7xl">
              Your kitchen is your{" "}
              <span className="relative inline-block">
                <span className="relative z-10">best ad.</span>
                <span className="absolute inset-x-0 bottom-1.5 h-4 -rotate-1 rounded bg-lime md:h-6" />
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Show customers what&apos;s happening behind their food. Live photos, auto time-stamped, on a profile you control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/business/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 font-bold text-white transition hover:gap-3"
              >
                List my restaurant · free <ArrowRight className="size-5" />
              </Link>
              <Link href="/business/dashboard" className="inline-flex items-center rounded-full border border-line bg-card px-6 py-3.5 font-bold">
                See demo dashboard
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">Setup takes about 5 minutes. No app download for your customers.</p>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-pop [animation-delay:150ms]">
            <div className="absolute -top-6 -right-4 z-10 rotate-6 rounded-2xl bg-lime px-3 py-2 font-display text-sm font-bold shadow-xl">
              🟢 Kitchen · 2 hours ago
            </div>
            <div className="absolute -bottom-5 -left-5 z-10 -rotate-6 rounded-2xl bg-ink px-3 py-2 font-display text-sm font-bold text-white shadow-xl">
              👀 426 kitchen peeks
            </div>
            <div className="grain rounded-[36px] border border-line bg-card p-4 shadow-2xl">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["👨‍🍳", "Kitchen", "bg-fresh"],
                  ["🧊", "Fridge", "bg-fresh"],
                  ["🥩", "Meat", "bg-fresh"],
                  ["🥬", "Veggies", "bg-fresh"],
                  ["🍽️", "Dining", "bg-aging"],
                  ["🍛", "Food", "bg-fresh"],
                ].map(([e, l, c]) => (
                  <div key={l} className="flex aspect-[4/3] flex-col justify-between rounded-2xl bg-paper p-3">
                    <span className="text-2xl">{e}</span>
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <span className={`size-2 rounded-full ${c}`} /> {l}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-2xl bg-ink p-3 text-white">
                <span className="text-xs text-white/60">Today&apos;s special</span>
                <span className="font-display font-bold">Chicken Biryani · <span className="text-lime">₹299</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-white">
        <div className="mx-auto max-w-5xl px-5">
          <p className="text-xs font-bold tracking-widest text-lime uppercase">How it works</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Snap. Stamped. Shown.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-[28px] bg-white/6 p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-7 text-lime" />
                  <span className="font-display text-5xl font-extrabold text-white/10">0{i + 1}</span>
                </div>
                <p className="mt-4 font-display text-2xl font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-white/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-xs font-bold tracking-widest text-grape uppercase">The freshness rule</p>
        <h2 className="mt-2 max-w-xl font-display text-4xl font-extrabold tracking-tight">
          You can&apos;t just write &ldquo;kitchen checked today&rdquo;. You have to show it.
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ["bg-fresh", "Updated 2 hours ago", "Fresh for 3 days after every upload. Customers love it."],
            ["bg-aging", "Updated 6 days ago", "Still visible, but customers notice. Time for a new drop."],
            ["bg-stale", "Outdated", "30+ days old. Shown in red to customers. Keep it fresh!"],
          ].map(([dot, label, body]) => (
            <div key={label} className="rounded-[28px] border border-line bg-card p-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-sm font-bold">
                <span className={`size-2.5 rounded-full ${dot}`} /> {label}
              </span>
              <p className="mt-3 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Every upload is stamped like <span className="font-mono font-semibold text-ink">Uploaded 13 Oct 2026 at 10:42 AM</span>. Recorded by
          InsideOut, never typed by you.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-3 md:grid-cols-3">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-[28px] bg-lime/40 p-6">
              <p.icon className="size-6" />
              <p className="mt-3 font-display text-xl font-bold">{p.title}</p>
              <p className="mt-1 text-sm text-ink/70">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[32px] bg-ink p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <h3 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">One QR. Everywhere.</h3>
              <p className="mt-2 text-white/60">Table · Counter · Menu · Receipt · Entrance. Customers scan and peek inside, no app needed.</p>
            </div>
            <Link
              href="/business/onboarding"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3.5 font-bold text-ink"
            >
              Get started <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
