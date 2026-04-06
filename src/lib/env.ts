import { z } from 'zod'

/**
 * Validated environment variables. Import this module instead of reading process.env directly.
 *
 * Required variables throw at module-load time if missing.
 * Optional variables (Sentry, Razorpay, Google Places) degrade gracefully when absent.
 */

const envSchema = z.object({
  // Firebase client SDK (required — app won't render without them)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_API_KEY. See .env.local.example.'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN. See .env.local.example.'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID. See .env.local.example.'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET. See .env.local.example.'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID. See .env.local.example.'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Missing required environment variable: NEXT_PUBLIC_FIREBASE_APP_ID. See .env.local.example.'),

  // Firebase Admin (required for server routes)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // Google Maps Places API (optional — only for ingestion scripts)
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // Razorpay (optional — premium payments disabled when absent)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Sentry (optional — error tracking disabled when absent)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Upstash Redis (optional — in-memory fallback used when absent)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Typesense (optional — Firestore prefix search used when absent)
  TYPESENSE_HOST: z.string().optional(),
  TYPESENSE_PORT: z.string().optional(),
  TYPESENSE_PROTOCOL: z.string().optional(),
  TYPESENSE_API_KEY: z.string().optional(),
  TYPESENSE_SEARCH_API_KEY: z.string().optional(),

  // Resend (optional — email notifications disabled when absent)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
})

/**
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when each key is referenced
 * as a direct property access. Passing the whole `process.env` object to Zod
 * leaves NEXT_PUBLIC_ vars as `undefined` in client bundles. We must build the
 * object with explicit references so Turbopack / webpack can replace them.
 */
const rawEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,

  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,

  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  TYPESENSE_HOST: process.env.TYPESENSE_HOST,
  TYPESENSE_PORT: process.env.TYPESENSE_PORT,
  TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL,
  TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY,
  TYPESENSE_SEARCH_API_KEY: process.env.TYPESENSE_SEARCH_API_KEY,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,

  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
}

function validateEnv() {
  const result = envSchema.safeParse(rawEnv)

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `\n\nEnvironment validation failed:\n${formatted}\n\nSee .env.local.example for setup instructions.\n`
    )
  }

  return result.data
}

export const env = validateEnv()
