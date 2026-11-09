# InsideOut

Show customers what's happening behind their food.

```
web/        Next.js app: customer app, restaurant dashboard, onboarding, QR kit, admin, API routes
supabase/   Database schema, security rules and storage (Supabase)
```

## Run locally

```bash
cd web
npm install          # npm cache stays inside web/.npm-cache
npm run db:migrate   # applies supabase/migrations/*.sql
npm run dev          # http://localhost:3000
```

Needs `web/.env.local` (see `web/.env.example`).

## Demo

Open the **Demo** tab on the right edge of any screen to jump between screens, time-travel (+3 / +7 / +30 days) to show freshness decay, or **Reset demo data** (reseeds 8 Hyderabad restaurants).

On `/business/login` there are three one-tap demo logins:

| Button | What it shows |
| --- | --- |
| Demo restaurant owner | Nizam's Table: dashboard, live uploads, specials, QR kit |
| Fresh account | Onboarding from scratch: register, FSSAI, capture, publish |
| InsideOut admin | `/admin`: verify FSSAI, hide photos, suspend, resolve reports |

| Screen | URL |
| --- | --- |
| Customer home | `/` |
| Restaurant profile | `/r/nizams-table` |
| For restaurants (pitch) | `/business` |
| Login / sign up | `/business/login` |
| Onboarding | `/business/onboarding` |
| Owner dashboard | `/business/dashboard` |
| QR kit | `/business/qr` |
| Admin | `/admin` |

Demo accounts and "Fresh account" users are fake data and get wiped by **Reset demo data**. Remove the demo logins before a real pilot.

## Scripts

```bash
npm run db:migrate                       # apply new migrations
npm run make-admin -- someone@email.com  # make an existing account an admin
npm run smoke -- http://localhost:3000   # end-to-end checks against the running app
```

## Deploy (Vercel)

Root directory `web`. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GOOGLE_PLACES_API_KEY`.

Camera preview needs HTTPS (or `localhost`). Over plain HTTP the app falls back to the phone's camera picker.

## Clean up

Everything is inside this folder. Delete `web/node_modules`, `web/.next` and `web/.npm-cache` to free space.
