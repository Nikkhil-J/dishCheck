# DishCheck Architecture

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel (Edge)                           │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Next.js    │  │ API Routes   │  │ Middleware              │  │
│  │ Pages/SSR  │  │ /api/*       │  │ (request timing)        │  │
│  └─────┬──────┘  └──────┬───────┘  └────────────────────────┘  │
│        │                │                                       │
│        │ reads          │ reads + writes                        │
│        ▼                ▼                                       │
│  ┌──────────────────────────────────┐                           │
│  │       Repository Layer           │                           │
│  │  (src/lib/repositories/)         │                           │
│  └──────────────┬───────────────────┘                           │
│                 │                                               │
│        ┌────────┼────────┐                                      │
│        ▼                 ▼                                      │
│  ┌──────────┐    ┌─────────────┐                                │
│  │ Client   │    │ Admin SDK   │                                │
│  │ SDK      │    │ (server)    │                                │
│  └────┬─────┘    └──────┬──────┘                                │
│       │                 │                                       │
└───────┼─────────────────┼───────────────────────────────────────┘
        │                 │
        ▼                 ▼
┌─────────────────────────────────────┐
│          Cloud Firestore            │
│  restaurants · dishes · reviews     │
│  users · notifications · coupons    │
│  billingEvents · restaurantClaims   │
└─────────────────────────────────────┘

External Services:
  Cloudinary ← photo uploads
  Razorpay   ← premium payments
  Sentry     ← error tracking
  Google Maps Places API ← restaurant ingestion
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Cloud Firestore |
| Auth | Firebase Auth (email + Google) |
| State | Zustand (client), TanStack Query (server) |
| Styling | Tailwind CSS v4 |
| Image uploads | Cloudinary |
| Deployment | Vercel |

## Directory Structure

```
src/
├── app/                        # Next.js App Router pages + API routes
│   ├── (public)/               # Unauthenticated pages (landing, dish detail, explore)
│   ├── (protected)/            # Authenticated user pages (home, write-review, settings)
│   ├── (auth)/                 # Login, signup, forgot-password
│   ├── (admin)/                # Admin dashboard pages
│   └── api/                    # Server API routes (all writes go here)
├── components/
│   ├── ui/                     # Reusable UI primitives (Card, StarRating, etc.)
│   ├── features/               # Feature-specific components (DishCard, ReviewCard, etc.)
│   └── layouts/                # Shell layouts (Navbar, Footer, PageShell)
├── lib/
│   ├── auth/                   # Auth providers and token verification
│   ├── constants/              # App-wide constants (tags, badges, cuisines, cities)
│   ├── firebase/               # Low-level Firestore CRUD (client SDK)
│   ├── hooks/                  # React hooks (read-only data fetching)
│   ├── repositories/           # Repository interfaces + Firebase implementations
│   ├── services/               # Business logic layer (called by API routes)
│   ├── store/                  # Zustand stores (authStore, wishlistStore)
│   ├── types/                  # All TypeScript types and interfaces
│   ├── utils/                  # Pure utility functions
│   └── validation/             # Zod schemas for API request validation
└── __tests__/                  # Test files
```

## Client / Server Data Boundary

This is the most important architectural rule in the codebase.

### The Rule

> **Client SDK is used for:** authenticated reads of public collections and
> real-time listeners on the user's own data (notifications, wishlist reads).
>
> **All writes, all admin operations, and all reward/points operations go
> through `/api/*` routes with Bearer token auth.**

### How It Works

```
Client Component
    │
    ├── READS  →  lib/hooks/  →  lib/repositories/  →  lib/firebase/  →  Firestore
    │              (useQuery)      (read methods)        (getDocs, getDoc)
    │
    └── WRITES →  fetch('/api/...', { headers: { authorization: 'Bearer <token>' } })
                      │
                      └──  API Route (src/app/api/)
                              │
                              ├── getRequestAuth(req)   ← verifies Firebase ID token
                              ├── Zod schema validation  ← validates request body
                              └── lib/repositories/      ← performs Firestore write
```

### Write Operations by Feature

| Feature | Client Path | Server Path |
|---|---|---|
| **Reviews** (create, edit, delete) | `fetch('/api/reviews/...')` | API route → reviewRepository |
| **Helpful votes** | `fetch('/api/reviews/[id]/helpful')` | API route → reviewRepository |
| **Review flagging** | `fetch('/api/reviews/[id]/flag')` | API route → reviewRepository |
| **Wishlist** (add, remove) | `fetch('/api/users/[userId]/wishlist/...')` | API route → wishlistRepository |
| **Notifications** (mark read) | `fetch('/api/notifications/...')` | API route → notificationRepository |
| **Admin** (role, premium, reviews, requests) | `fetch('/api/admin/...')` | API route → adminDb (firebase-admin) |
| **Rewards** (redeem coupon, view balance) | `fetch('/api/rewards/...')` | API route → pointsRepository |
| **User profile create** | Auth hook → userRepository.createFromAuthUser | Client SDK (self-write) |
| **User profile update** | Settings → userRepository.update | Client SDK (self-write) |

### Sanctioned Client-Side Writes

Two operations use the client Firestore SDK to write directly:

1. **User document creation on first sign-in** (`src/lib/firebase/users.ts` → `createUser`):
   The auth hook creates the user's own document when they first sign in. Firestore
   security rules restrict this to `users/{userId}` where `userId` matches the
   authenticated user's UID.

2. **User profile update** (`src/lib/firebase/users.ts` → `updateUser`):
   The settings page updates whitelisted fields (displayName, avatarUrl, city, area,
   favoriteCuisines) on the user's own document. Firestore rules enforce that only
   the document owner can write, and only to these specific fields.

These are intentional and enforced by Firestore security rules. They do **not**
touch sensitive fields (isAdmin, isPremium, dishPointsBalance).

### Auth Flow for API Routes

Every API route that accepts writes follows this pattern:

1. Extract Bearer token from `Authorization` header
2. Verify token using `getRequestAuth()` (`src/lib/services/request-auth.ts`)
3. Validate request body with Zod schema (when applicable)
4. Perform the write through the repository layer
5. Return JSON response

Admin routes additionally check `auth.isAdmin === true` and return 403 if false.

## Data Layer

### Repository Pattern

All Firestore access goes through the repository layer:

- **Interfaces** in `src/lib/repositories/` define the contract
- **Implementations** in `src/lib/repositories/firebase/` use either client SDK or firebase-admin
- **Instantiation** in `src/lib/repositories/index.ts` — single source of truth

### Firebase Files (`src/lib/firebase/`)

These files contain low-level Firestore operations using the **client SDK**.
They are called by repository implementations. Write functions in these files
should only be reachable from:
- API route handlers (server context), OR
- The two sanctioned client-side writes listed above

### Mappers (`src/lib/repositories/firebase/mappers.ts`)

All Firestore documents pass through mapper functions that:
- Convert Firestore Timestamps to ISO strings
- Default nullable fields for backward compatibility with old documents

## Collections

| Collection | Document ID | Access |
|---|---|---|
| `restaurants` | auto / `gp-*` (ingested) | Server writes, client reads |
| `dishes` | auto / generated | Server writes, client reads |
| `reviews` | auto | Server writes, client reads |
| `users` | Firebase Auth UID | Self-writes (whitelisted fields), server writes (admin fields) |
| `dishRequests` | auto | Server writes, client reads |
| `notifications` | auto | Server writes, client reads |
| `coupons` | auto | Server writes only |
| `users/{uid}/wishlist/{dishId}` | dish ID | Server writes via API, client reads |
| `users/{uid}/pointTransactions/{id}` | auto | Server writes only |
| `billingEvents` | auto | Server writes only |
| `restaurantClaims` | auto | Server writes, client reads (own) |
| `analyticsCache` (subcollection) | auto | Server writes only |
