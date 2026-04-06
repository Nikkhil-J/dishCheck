/**
 * SCRIPT 2: seed-from-json.ts
 *
 * Reads scripts/data/restaurants-raw.json (after you've filled in dishes)
 * and writes all restaurants + dishes to Firestore.
 *
 * Run from your DishCheck project root:
 *   npx tsx scripts/seed-from-json.ts [--dry-run]
 *
 * Flags:
 *   --dry-run    Show what would be written without actually writing
 *   --city=X     Only seed restaurants for a specific city
 *
 * Requirements:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load env vars from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ── Init Firebase Admin ───────────────────────────────────────────────────────

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Missing Firebase Admin credentials.");
    console.error(
      "   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local",
    );
    process.exit(1);
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DishEntry {
  name: string;
  description: string;
  category: string;
  dietary: "veg" | "non-veg" | "egg";
  priceRange: string;
}

interface RestaurantEntry {
  googlePlaceId: string;
  name: string;
  city: string;
  area: string;
  address: string;
  coordinates: { lat: number; lng: number };
  googleRating: number | null;
  googleMapsUrl: string | null;
  website: string | null;
  phoneNumber: string | null;
  cuisines: string[];
  priceLevel: string | null;
  types: string[];
  dishes: DishEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  "Starter",
  "Main Course",
  "Biryani",
  "Bread",
  "Dessert",
  "Beverage",
  "Snack",
  "Side Dish",
  "Salad",
  "Soup",
];

const VALID_DIETARY = ["veg", "non-veg", "egg"];

function validateDish(
  dish: DishEntry,
  restaurantName: string,
  index: number,
): string[] {
  const errors: string[] = [];
  if (!dish.name?.trim()) errors.push(`Dish ${index}: missing name`);
  if (!VALID_CATEGORIES.includes(dish.category)) {
    errors.push(
      `Dish ${index} "${dish.name}": invalid category "${dish.category}". Valid: ${VALID_CATEGORIES.join(", ")}`,
    );
  }
  if (!VALID_DIETARY.includes(dish.dietary)) {
    errors.push(
      `Dish ${index} "${dish.name}": invalid dietary "${dish.dietary}". Valid: veg, non-veg, egg`,
    );
  }
  if (!dish.priceRange?.includes("-") && dish.priceRange !== "1500+") {
    errors.push(
      `Dish ${index} "${dish.name}": priceRange should be like "200-400"`,
    );
  }
  return errors;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const cityFilter = process.argv
    .find((a) => a.startsWith("--city="))
    ?.split("=")[1];

  console.log("🍽️  DishCheck JSON Seeder");
  console.log("==========================");
  if (isDryRun) console.log("🔍 DRY RUN — nothing will be written\n");
  if (cityFilter) console.log(`🏙️  Filtering to city: ${cityFilter}\n`);

  // Read the JSON file
  const jsonPath = path.join(
    process.cwd(),
    "scripts",
    "data",
    "restaurants-raw.json",
  );
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    console.error("   Run fetch-restaurants.ts first to generate this file");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  let restaurants: RestaurantEntry[] = raw.restaurants ?? [];

  // Apply city filter
  if (cityFilter) {
    restaurants = restaurants.filter(
      (r) => r.city.toLowerCase() === cityFilter.toLowerCase(),
    );
  }

  // Validate all data before writing anything
  console.log("🔍 Validating data...");
  let hasErrors = false;
  for (const restaurant of restaurants) {
    if (!restaurant.name) {
      console.error(
        `❌ Restaurant missing name: ${JSON.stringify(restaurant)}`,
      );
      hasErrors = true;
      continue;
    }
    if (!restaurant.city) {
      console.error(`❌ "${restaurant.name}": missing city`);
      hasErrors = true;
    }
    if (!restaurant.area) {
      console.error(`❌ "${restaurant.name}": missing area`);
      hasErrors = true;
    }
    if (!restaurant.cuisines?.length) {
      console.error(`❌ "${restaurant.name}": missing cuisines`);
      hasErrors = true;
    }
    if (restaurant.dishes.length === 0) {
      console.warn(
        `⚠️  "${restaurant.name}" has no dishes — will be seeded without dishes`,
      );
    }
    for (let i = 0; i < restaurant.dishes.length; i++) {
      const errors = validateDish(restaurant.dishes[i], restaurant.name, i + 1);
      for (const err of errors) {
        console.error(`❌ "${restaurant.name}": ${err}`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error(
      "\n❌ Validation failed. Fix the errors above before seeding.",
    );
    process.exit(1);
  }
  console.log("✅ Validation passed\n");

  // Stats
  const totalDishes = restaurants.reduce((sum, r) => sum + r.dishes.length, 0);
  const withDishes = restaurants.filter((r) => r.dishes.length > 0).length;
  console.log(`📊 Ready to seed:`);
  console.log(
    `   Restaurants: ${restaurants.length} (${withDishes} with dishes)`,
  );
  console.log(`   Dishes: ${totalDishes}`);
  console.log(
    `   Cities: ${[...new Set(restaurants.map((r) => r.city))].join(", ")}\n`,
  );

  if (isDryRun) {
    console.log("📋 DRY RUN — would write:");
    for (const r of restaurants) {
      console.log(
        `  🏪 ${r.name} (${r.area}, ${r.city}) — ${r.dishes.length} dishes`,
      );
      for (const d of r.dishes) {
        console.log(
          `      🍽️  ${d.name} [${d.dietary}] [${d.category}] ₹${d.priceRange}`,
        );
      }
    }
    console.log("\n✅ Dry run complete. Remove --dry-run to actually seed.");
    return;
  }

  // Init Firebase
  initAdmin();
  const db = getFirestore();

  let restaurantsWritten = 0;
  let dishesWritten = 0;
  let restaurantsSkipped = 0;

  for (const restaurant of restaurants) {
    process.stdout.write(
      `🏪 ${restaurant.name} (${restaurant.area}, ${restaurant.city})... `,
    );

    // Check if restaurant with this googlePlaceId already exists
    let restaurantId: string;
    if (restaurant.googlePlaceId) {
      const existing = await db
        .collection("restaurants")
        .where("googlePlaceId", "==", restaurant.googlePlaceId)
        .limit(1)
        .get();

      if (!existing.empty) {
        restaurantId = existing.docs[0].id;
        process.stdout.write(`(exists, id: ${restaurantId}) `);
        restaurantsSkipped++;
      } else {
        // Create new restaurant
        const restaurantRef = db.collection("restaurants").doc();
        restaurantId = restaurantRef.id;
        await restaurantRef.set({
          name: restaurant.name,
          city: restaurant.city,
          area: restaurant.area,
          address: restaurant.address,
          coordinates: restaurant.coordinates,
          cuisines: restaurant.cuisines,
          googlePlaceId: restaurant.googlePlaceId,
          googleRating: restaurant.googleRating,
          googleMapsUrl: restaurant.googleMapsUrl,
          website: restaurant.website,
          phoneNumber: restaurant.phoneNumber,
          coverImage: null,
          ownerId: null,
          isVerified: false,
          isActive: true,
          createdAt: Timestamp.now(),
        });
        restaurantsWritten++;
      }
    } else {
      // No googlePlaceId — always create
      const restaurantRef = db.collection("restaurants").doc();
      restaurantId = restaurantRef.id;
      await restaurantRef.set({
        name: restaurant.name,
        city: restaurant.city,
        area: restaurant.area,
        address: restaurant.address,
        coordinates: restaurant.coordinates,
        cuisines: restaurant.cuisines,
        googlePlaceId: null,
        googleRating: restaurant.googleRating,
        googleMapsUrl: restaurant.googleMapsUrl,
        website: restaurant.website,
        phoneNumber: restaurant.phoneNumber,
        coverImage: null,
        ownerId: null,
        isVerified: false,
        isActive: true,
        createdAt: Timestamp.now(),
      });
      restaurantsWritten++;
    }

    // Seed dishes
    let dishCount = 0;
    for (const dish of restaurant.dishes) {
      // Check if dish already exists for this restaurant
      const existingDish = await db
        .collection("dishes")
        .where("restaurantId", "==", restaurantId)
        .where("nameLower", "==", dish.name.toLowerCase())
        .limit(1)
        .get();

      if (!existingDish.empty) continue; // skip duplicate

      const dishRef = db.collection("dishes").doc();
      await dishRef.set({
        restaurantId,
        restaurantName: restaurant.name,
        name: dish.name,
        nameLower: dish.name.toLowerCase(),
        description: dish.description ?? "",
        category: dish.category,
        dietary: dish.dietary,
        priceRange: dish.priceRange,
        cuisines: restaurant.cuisines,
        area: restaurant.area,
        city: restaurant.city,
        coverImage: null,
        avgTaste: 0,
        avgPortion: 0,
        avgValue: 0,
        avgOverall: 0,
        reviewCount: 0,
        topTags: [],
        isActive: true,
        createdAt: Timestamp.now(),
      });
      dishCount++;
      dishesWritten++;
    }

    console.log(`✅ (${dishCount} dishes)`);

    // Small delay to avoid Firestore rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("\n==================================");
  console.log(`✅ Seeding complete!`);
  console.log(`   Restaurants created: ${restaurantsWritten}`);
  console.log(`   Restaurants skipped (already exist): ${restaurantsSkipped}`);
  console.log(`   Dishes created: ${dishesWritten}`);
  console.log("\nNext steps:");
  console.log("  1. Run: npx tsx scripts/backfill-dish-denorm.ts");
  console.log("  2. If using Typesense: npx tsx scripts/sync-typesense.ts");
}

main().catch(console.error);
