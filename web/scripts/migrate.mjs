// Applies supabase/migrations/*.sql that haven't run yet. Usage: npm run db:migrate
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;
const dir = new URL("../../supabase/migrations/", import.meta.url).pathname;

const candidates = [
  env.SUPABASE_DB_HOST && { host: env.SUPABASE_DB_HOST, user: `postgres.${ref}` },
  { host: `db.${ref}.supabase.co`, user: "postgres" },
  ...["aws-0", "aws-1"].flatMap((p) =>
    ["ap-south-1", "ap-southeast-1", "us-east-1", "eu-central-1"].map((r) => ({ host: `${p}-${r}.pooler.supabase.com`, user: `postgres.${ref}` })),
  ),
].filter(Boolean);

async function connect() {
  for (const c of candidates) {
    const client = new pg.Client({ ...c, port: 5432, database: "postgres", password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
    try {
      await client.connect();
      console.log(`Connected via ${c.host}`);
      return client;
    } catch (e) {
      await client.end().catch(() => {});
      if (/password authentication failed/i.test(e.message)) throw e;
    }
  }
  throw new Error("Could not reach the database. Set SUPABASE_DB_HOST in .env.local (Supabase → Connect → Session pooler host).");
}

const client = await connect();
try {
  await client.query(`create schema if not exists app_meta;
    create table if not exists app_meta.migrations (name text primary key, applied_at timestamptz not null default now());`);
  const done = new Set((await client.query("select name from app_meta.migrations")).rows.map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    process.stdout.write(`Applying ${f} … `);
    await client.query("begin");
    try {
      await client.query(readFileSync(join(dir, f), "utf8"));
      await client.query("insert into app_meta.migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log("done");
    } catch (e) {
      await client.query("rollback");
      console.log("failed");
      throw e;
    }
  }
  await client.query("notify pgrst, 'reload schema'");
  console.log("Database is up to date.");
} finally {
  await client.end();
}
