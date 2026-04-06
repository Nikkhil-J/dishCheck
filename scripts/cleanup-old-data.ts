import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length > 0) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(isDryRun ? "🔍 DRY RUN" : "🗑️  Deleting old data...");

  initAdmin();
  const db = getFirestore();

  // Old restaurant IDs to delete
  const oldRestaurantIds = ["rest-1", "rest-2", "rest-3"];

  // Old dish IDs to delete
  const oldDishIds = ["dish-1", "dish-2", "dish-3"];

  for (const id of oldRestaurantIds) {
    if (isDryRun) {
      console.log(`  Would delete restaurant: ${id}`);
    } else {
      await db.collection("restaurants").doc(id).delete();
      console.log(`  ✅ Deleted restaurant: ${id}`);
    }
  }

  for (const id of oldDishIds) {
    if (isDryRun) {
      console.log(`  Would delete dish: ${id}`);
    } else {
      await db.collection("dishes").doc(id).delete();
      console.log(`  ✅ Deleted dish: ${id}`);
    }
  }

  console.log("\n✅ Done");
}

main().catch(console.error);
