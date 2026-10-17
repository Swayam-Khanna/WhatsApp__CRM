import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { db } from "../backend/db";
import { profiles, farmerProfiles, farmerProducts, productReviews } from "../backend/schema";
import * as dotenv from "dotenv";
dotenv.config();

// Ensure you have a service-account.json in the root directory before running this.
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  console.warn(
    "WARNING: No FIREBASE_SERVICE_ACCOUNT_PATH in .env. Using default './service-account.json'",
  );
}

import * as fs from "fs";
import * as path from "path";

try {
  const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "service-account.json",
  );
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  initializeApp({
    credential: cert(serviceAccount),
  });
} catch (e) {
  console.error("Failed to initialize Firebase Admin:", e);
  process.exit(1);
}

const firestore = getFirestore();
const BATCH_SIZE = 500;

async function migrateUsers() {
  console.log("--- Starting Profiles (Users) Migration ---");
  let lastDoc: any = null;
  let hasMore = true;
  let totalMigrated = 0;

  while (hasMore) {
    let query = firestore.collection("users").limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const rowsToInsert = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        fullName: data.name || data.fullName || "Anonymous User",
        email: data.email || null,
        phone: data.phone || null,
        avatarUrl: data.avatarUrl || data.photoURL || null,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      };
    });

    try {
      await db.insert(profiles).values(rowsToInsert).onConflictDoNothing();
      totalMigrated += rowsToInsert.length;
      console.log(`Migrated ${totalMigrated} users...`);
    } catch (err) {
      console.error("Error inserting profiles batch:", err);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  console.log("Profiles migration complete!\n");
}

async function migrateFarmers() {
  console.log("--- Starting Farmer Profiles Migration ---");
  let lastDoc: any = null;
  let hasMore = true;
  let totalMigrated = 0;

  while (hasMore) {
    let query = firestore.collection("farmer_profiles").limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const rowsToInsert = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.user_id || data.userId, // FK to profiles
        fullName: data.fullName || data.name || "Unknown Farmer",
        farmName: data.farmName || "Unnamed Farm",
        phone: data.phone || "0000000000",
        slug: data.slug || doc.id,
        status: ["draft", "pending", "approved", "rejected", "suspended"].includes(data.status)
          ? data.status
          : "draft",
        state: data.state || "Unknown",
        village: data.village || "Unknown",
        crops: Array.isArray(data.crops) ? data.crops : [],
        farmingMethod: data.farmingMethod || data.method || null,
        story: data.story || null,
        portraitUrl: data.portraitUrl || data.image || null,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      };
    });

    try {
      // Must ignore on conflict in case it already ran
      await db.insert(farmerProfiles).values(rowsToInsert).onConflictDoNothing();
      totalMigrated += rowsToInsert.length;
      console.log(`Migrated ${totalMigrated} farmers...`);
    } catch (err) {
      console.error("Error inserting farmers batch:", err);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  console.log("Farmer Profiles migration complete!\n");
}

async function migrateProducts() {
  console.log("--- Starting Farmer Products Migration ---");
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let totalMigrated = 0;

  while (hasMore) {
    let query = firestore.collection("farmer_products").limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const rowsToInsert = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.user_id || data.userId, // Assuming it has user_id
        farmerId: data.farmer_id || data.farmerId, // FK to farmer_profiles
        name: data.name || "Unnamed Product",
        slug: data.slug || doc.id,
        description: data.description || null,
        price: parseFloat(data.price) || 0,
        category: data.category || "general",
        stock: parseInt(data.stock, 10) || 0,
        unit: data.unit || "kg",
        images: Array.isArray(data.images) ? data.images : data.image ? [data.image] : [],
        status: ["draft", "pending", "published", "rejected", "archived"].includes(data.status)
          ? data.status
          : "draft",
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      };
    });

    try {
      await db.insert(farmerProducts).values(rowsToInsert).onConflictDoNothing();
      totalMigrated += rowsToInsert.length;
      console.log(`Migrated ${totalMigrated} products...`);
    } catch (err) {
      console.error("Error inserting products batch:", err);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  console.log("Farmer Products migration complete!\n");
}

async function runMigration() {
  console.log("=== BEGINNING MIGRATION ===");
  try {
    // Note: Order is critical due to PostgreSQL Foreign Key Constraints
    // users -> farmerProfiles -> farmerProducts
    await migrateUsers();
    await migrateFarmers();
    await migrateProducts();
    console.log("=== MIGRATION FINISHED SUCCESSFULLY ===");
  } catch (error) {
    console.error("=== MIGRATION FAILED ===", error);
  } finally {
    process.exit(0);
  }
}

runMigration();
