export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);

export const num = (n: number) => n.toLocaleString("en-IN");

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function isOpen(hours: { open: string; close: string }, now: number): boolean {
  const d = new Date(now);
  const cur = d.getHours() * 60 + d.getMinutes();
  const open = toMinutes(hours.open);
  let close = toMinutes(hours.close);
  if (close <= open) close += 24 * 60;
  return (cur >= open && cur < close) || (cur + 24 * 60 >= open && cur + 24 * 60 < close);
}

export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

export function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
