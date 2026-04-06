import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

async function main() {
  console.log("\n=== RESTAURANTS ===");
  const allRests = await db.collection("restaurants").get();
  console.log(`Total restaurants: ${allRests.size}`);
  allRests.docs.forEach((d) => {
    const data = d.data();
    console.log(
      `  ${data.name} | city: "${data.city}" | isActive: ${data.isActive}`,
    );
  });

  console.log("\n=== DISHES (first 5 per city) ===");
  for (const city of ["Bengaluru", "Gurugram"]) {
    const snap = await db
      .collection("dishes")
      .where("city", "==", city)
      .limit(5)
      .get();
    console.log(`\n${city}: ${snap.size} dishes found`);
    snap.docs.forEach((d) => {
      const data = d.data();
      console.log(
        `  ${data.name} | city: "${data.city}" | isActive: ${data.isActive}`,
      );
    });
  }

  console.log("\n=== DISHES WITH NO CITY ===");
  const noCitySnap = await db
    .collection("dishes")
    .where("isActive", "==", true)
    .limit(5)
    .get();
  console.log(`Sample of active dishes (checking city field):`);
  noCitySnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`  ${data.name} | city: "${data.city}"`);
  });
}

main().catch(console.error);
