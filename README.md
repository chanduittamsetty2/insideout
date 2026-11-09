# InsideOut

Show customers what's happening behind their food.

```
web/        Next.js frontend: customer app, restaurant dashboard, onboarding, QR kit
supabase/   Backend: database schema, security rules, storage (Supabase)
```

## Run locally

```bash
cd web
npm install      # npm cache stays inside web/.npm-cache
npm run dev      # http://localhost:3000
```

Without Supabase keys the app runs in **demo mode**: data lives in your browser, and photos you capture are saved locally.
Use the **Demo** tab on the right edge of the screen to jump between screens, time-travel (+3 / +7 / +30 days) to show freshness decay, or reset the demo.

| Screen | URL |
| --- | --- |
| Customer home | `/` |
| Restaurant profile | `/r/nizams-table` |
| For restaurants (pitch) | `/business` |
| Onboarding | `/business/onboarding` |
| Owner dashboard | `/business/dashboard` |
| QR kit | `/business/qr` |

## Connect real services

1. Copy `web/.env.example` to `web/.env.local` and fill in the keys.
2. Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor.

Camera preview needs HTTPS (or `localhost`). To test on a phone, deploy to Vercel. Over plain HTTP on your LAN, the app falls back to the phone's camera picker.

## Clean up

Everything is inside this folder. Delete `web/node_modules`, `web/.next` and `web/.npm-cache` to free space.
