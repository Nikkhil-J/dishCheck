# DishCheck

Dish-level review platform for India. Users search for a specific dish at a specific restaurant and read or write reviews with photos, sub-ratings (taste, portion, value), and tags. Includes a DishPoints economy, premium tier, and restaurant owner dashboards.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Cloud Firestore |
| Auth | Firebase Auth (email + Google) |
| State | Zustand (client), TanStack Query (server cache) |
| Styling | Tailwind CSS v4 |
| Image uploads | Cloudinary |
| Payments | Razorpay |
| Error tracking | Sentry (optional) |
| Deployment | Vercel |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.local.example .env.local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

All required and optional variables are documented in `.env.local.example`. At minimum you need:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Yes | Firebase client SDK config |
| `FIREBASE_PROJECT_ID` | Yes (server) | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Yes (server) | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Yes (server) | Firebase Admin SDK |
| `NEXT_PUBLIC_CLOUDINARY_*` | No | Photo uploads |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Premium payments |
| `SENTRY_DSN` | No | Error tracking |
| `GOOGLE_PLACES_API_KEY` | No | Restaurant ingestion script |

If required variables are missing, the app throws a descriptive error at startup (see `src/lib/env.ts`).

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
npm run test:unit    # Vitest unit tests

npm run ingest       # Ingest restaurants from Google Places API
npx tsx scripts/seed.ts           # Seed sample data
npx tsx scripts/seed-cities.ts    # Seed city metadata
npx tsx scripts/backfill-dish-denorm.ts  # Backfill denormalized dish fields
```

## Firestore Emulator

For local development without touching production data:

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Start emulators
firebase emulators:start --only firestore

# Seed the emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npx tsx scripts/seed.ts
```

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (public)/               # Unauthenticated pages
│   ├── (protected)/            # Authenticated pages
│   ├── (auth)/                 # Login / signup / forgot-password
│   ├── (admin)/                # Admin dashboard
│   └── api/                    # API routes (all writes)
├── components/
│   ├── ui/                     # Reusable primitives
│   ├── features/               # Feature components
│   └── layouts/                # Shells, Navbar, Footer
├── lib/
│   ├── auth/                   # Token verification
│   ├── constants/              # Tags, badges, cuisines
│   ├── env.ts                  # Validated env vars (Zod)
│   ├── firebase/               # Firestore CRUD (client SDK)
│   ├── hooks/                  # React hooks (reads only)
│   ├── monitoring/             # Sentry wrapper
│   ├── repositories/           # Repository pattern
│   ├── services/               # Business logic
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript types
│   ├── utils/                  # Utility functions
│   └── validation/             # Zod schemas
└── __tests__/                  # Unit tests
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full data flow, client/server boundary rules, and collection access matrix.

## Deploy

The app deploys to Vercel on push to `main`. The CI pipeline (`.github/workflows/ci.yml`) runs lint, typecheck, and unit tests before deploy.

On deploy to main, Sentry source maps are uploaded for readable stack traces.

## Key Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, data flow, client/server boundary
- [docs/RUNBOOK.md](./docs/RUNBOOK.md) — Operational procedures and incident response
- [docs/REWARDS_SYSTEM.md](./docs/REWARDS_SYSTEM.md) — DishPoints ledger specification
