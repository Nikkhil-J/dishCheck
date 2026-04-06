/**
 * SCRIPT 1: fetch-restaurants.ts
 *
 * Fetches real restaurants from Google Places API for Bengaluru and Gurugram.
 * Outputs a JSON file (restaurants-raw.json) that you then fill with dish data.
 *
 * Run from your DishCheck project root:
 *   GOOGLE_PLACES_API_KEY=AIzaSy... npx tsx scripts/fetch-restaurants.ts
 *
 * Output: scripts/data/restaurants-raw.json
 */

import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("❌ GOOGLE_PLACES_API_KEY is not set");
  console.error(
    "Run: GOOGLE_PLACES_API_KEY=your_key npx tsx scripts/fetch-restaurants.ts",
  );
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────────────────

const SEARCHES = [
  // Bengaluru
  {
    city: "Bengaluru",
    area: "Koramangala",
    query: "popular restaurants in Koramangala Bengaluru",
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    city: "Bengaluru",
    area: "Indiranagar",
    query: "popular restaurants in Indiranagar Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    city: "Bengaluru",
    area: "HSR Layout",
    query: "popular restaurants in HSR Layout Bengaluru",
    lat: 12.9116,
    lng: 77.6474,
  },
  {
    city: "Bengaluru",
    area: "Jayanagar",
    query: "popular restaurants in Jayanagar Bengaluru",
    lat: 12.9308,
    lng: 77.5838,
  },
  {
    city: "Bengaluru",
    area: "Whitefield",
    query: "popular restaurants in Whitefield Bengaluru",
    lat: 12.9698,
    lng: 77.7499,
  },
  // Gurugram
  {
    city: "Gurugram",
    area: "Cyber Hub",
    query: "popular restaurants in Cyber Hub Gurugram",
    lat: 28.495,
    lng: 77.0888,
  },
  {
    city: "Gurugram",
    area: "Golf Course Road",
    query: "popular restaurants in Golf Course Road Gurugram",
    lat: 28.4595,
    lng: 77.1026,
  },
  {
    city: "Gurugram",
    area: "Sohna Road",
    query: "popular restaurants in Sohna Road Gurugram",
    lat: 28.4089,
    lng: 77.0454,
  },
  {
    city: "Gurugram",
    area: "MG Road",
    query: "popular restaurants in MG Road Gurugram",
    lat: 28.4726,
    lng: 77.0632,
  },
  {
    city: "Gurugram",
    area: "Sector 29",
    query: "popular restaurants in Sector 29 Gurugram",
    lat: 28.4744,
    lng: 77.0788,
  },
];

const RESULTS_PER_SEARCH = 10;
const DELAY_MS = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  types?: string[];
  websiteUri?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  priceLevel?: string;
  primaryType?: string;
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

interface DishEntry {
  name: string;
  description: string;
  category: string;
  dietary: "veg" | "non-veg" | "egg";
  priceRange: string;
}

// ── Cuisine mapping from Google place types ────────────────────────────────────

function inferCuisines(types: string[], name: string): string[] {
  const cuisineMap: Record<string, string> = {
    indian_restaurant: "North Indian",
    south_indian_restaurant: "South Indian",
    chinese_restaurant: "Chinese",
    italian_restaurant: "Italian",
    pizza_restaurant: "Pizza",
    fast_food_restaurant: "Fast Food",
    cafe: "Cafe",
    bakery: "Bakery",
    bar: "Continental",
    meal_takeaway: "North Indian",
    meal_delivery: "North Indian",
  };

  const nameLower = name.toLowerCase();

  // Name-based inference first (more accurate)
  if (
    nameLower.includes("south indian") ||
    nameLower.includes("udupi") ||
    nameLower.includes("dosa") ||
    nameLower.includes("idli")
  )
    return ["South Indian"];
  if (
    nameLower.includes("biryani") ||
    nameLower.includes("mughal") ||
    nameLower.includes("nawab")
  )
    return ["Biryani", "Mughlai"];
  if (
    nameLower.includes("chinese") ||
    nameLower.includes("dragon") ||
    nameLower.includes("wok")
  )
    return ["Chinese"];
  if (nameLower.includes("pizza") || nameLower.includes("italian"))
    return ["Italian", "Pizza"];
  if (nameLower.includes("burger") || nameLower.includes("grill"))
    return ["Burgers", "Continental"];
  if (
    nameLower.includes("cafe") ||
    nameLower.includes("coffee") ||
    nameLower.includes("brew")
  )
    return ["Cafe", "Continental"];
  if (nameLower.includes("punjabi") || nameLower.includes("dhaba"))
    return ["North Indian", "Punjabi"];
  if (nameLower.includes("kebab") || nameLower.includes("tandoor"))
    return ["North Indian", "Mughlai"];
  if (nameLower.includes("thai")) return ["Thai"];
  if (nameLower.includes("japanese") || nameLower.includes("sushi"))
    return ["Japanese"];
  if (nameLower.includes("mexican")) return ["Mexican"];

  // Type-based inference as fallback
  for (const type of types) {
    if (cuisineMap[type]) return [cuisineMap[type]];
  }

  return ["North Indian"]; // default for India
}

function inferPriceRange(priceLevel: string | undefined): string | null {
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: "0-100",
    PRICE_LEVEL_INEXPENSIVE: "100-300",
    PRICE_LEVEL_MODERATE: "300-700",
    PRICE_LEVEL_EXPENSIVE: "700-1500",
    PRICE_LEVEL_VERY_EXPENSIVE: "1500+",
  };
  return priceLevel ? (map[priceLevel] ?? null) : null;
}

// ── API call ──────────────────────────────────────────────────────────────────

async function searchPlaces(
  search: (typeof SEARCHES)[0],
): Promise<RestaurantEntry[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const fields = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.types",
    "places.websiteUri",
    "places.internationalPhoneNumber",
    "places.googleMapsUri",
    "places.priceLevel",
    "places.primaryType",
  ].join(",");

  const body = {
    textQuery: search.query,
    maxResultCount: RESULTS_PER_SEARCH,
    locationBias: {
      circle: {
        center: { latitude: search.lat, longitude: search.lng },
        radius: 2000.0,
      },
    },
    includedType: "restaurant",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": fields,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ API error for ${search.area}: ${res.status} ${err}`);
    return [];
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  const places = data.places ?? [];

  return places
    .filter((p) => p.displayName?.text && p.location)
    .map((p) => ({
      googlePlaceId: p.id,
      name: p.displayName!.text,
      city: search.city,
      area: search.area,
      address: p.formattedAddress ?? "",
      coordinates: {
        lat: p.location!.latitude,
        lng: p.location!.longitude,
      },
      googleRating: p.rating ?? null,
      googleMapsUrl: p.googleMapsUri ?? null,
      website: p.websiteUri ?? null,
      phoneNumber: p.internationalPhoneNumber ?? null,
      cuisines: inferCuisines(p.types ?? [], p.displayName!.text),
      priceLevel: inferPriceRange(p.priceLevel),
      types: p.types ?? [],
      // ── FILL THIS IN MANUALLY ──────────────────────────────────────────────
      // After running this script, open scripts/data/restaurants-raw.json
      // For each restaurant, add dishes in the array below.
      // Use Zomato/Swiggy to find the actual menu items.
      // Each dish needs: name, description, category, dietary, priceRange
      dishes: [] as DishEntry[],
    }));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🍽️  DishCheck Restaurant Fetcher");
  console.log("==================================");
  console.log(
    `Fetching restaurants for ${SEARCHES.length} areas across 2 cities...\n`,
  );

  const allRestaurants: RestaurantEntry[] = [];
  const seenIds = new Set<string>();

  for (const search of SEARCHES) {
    console.log(`📍 Fetching: ${search.area}, ${search.city}...`);
    const results = await searchPlaces(search);

    let added = 0;
    let dupes = 0;
    for (const r of results) {
      if (seenIds.has(r.googlePlaceId)) {
        dupes++;
        continue;
      }
      seenIds.add(r.googlePlaceId);
      allRestaurants.push(r);
      added++;
    }

    console.log(
      `  ✅ ${added} restaurants added (${dupes} duplicates skipped)`,
    );
    await delay(DELAY_MS);
  }

  // Sort by city then area
  allRestaurants.sort((a, b) => {
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.name.localeCompare(b.name);
  });

  // Write output
  const outputDir = path.join(process.cwd(), "scripts", "data");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "restaurants-raw.json");

  const output = {
    _instructions: [
      "1. Review each restaurant below — remove any that are not actual restaurants (hotels, etc)",
      "2. For each restaurant, fill in the dishes[] array using Zomato/Swiggy for the menu",
      "3. Each dish needs: name, description, category, dietary, priceRange",
      "4. category options: Starter, Main Course, Biryani, Bread, Dessert, Beverage, Snack, Side Dish",
      "5. dietary options: veg, non-veg, egg",
      '6. priceRange format: "100-200" or "200-400" etc (in INR per portion)',
      "7. Once filled, run: npx tsx scripts/seed-from-json.ts",
    ],
    _stats: {
      totalRestaurants: allRestaurants.length,
      bengaluru: allRestaurants.filter((r) => r.city === "Bengaluru").length,
      gurugram: allRestaurants.filter((r) => r.city === "Gurugram").length,
      fetchedAt: new Date().toISOString(),
    },
    restaurants: allRestaurants,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("\n==================================");
  console.log(`✅ Done! ${allRestaurants.length} unique restaurants fetched`);
  console.log(`   Bengaluru: ${output._stats.bengaluru}`);
  console.log(`   Gurugram:  ${output._stats.gurugram}`);
  console.log(`\n📄 Output: scripts/data/restaurants-raw.json`);
  console.log("\nNext steps:");
  console.log("  1. Open scripts/data/restaurants-raw.json");
  console.log("  2. For each restaurant, add dishes using Zomato/Swiggy menus");
  console.log("  3. Run: npx tsx scripts/seed-from-json.ts");
}

main().catch(console.error);
