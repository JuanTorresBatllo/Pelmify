/**
 * Seed script — creates the 6 worker profiles in Firestore.
 *
 * Workers have no Firebase Auth accounts; they are Firestore-only documents
 * with role "worker". The kiosk tablet (info@pelmo.it) looks them up by role.
 *
 * Prerequisites (do once in Firebase Console / Authentication):
 *   1. Create Auth account for the admin:  francesca.etm@gmail.com
 *   2. Create Auth account for the kiosk:  info@pelmo.it  /  Pelmo1919
 *
 * Usage (from the project root — sign in as kiosk or admin):
 *   node scripts/seed.mjs info@pelmo.it Pelmo1919
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Args ────────────────────────────────────────────────────────────────────

const EMAIL = process.argv[2];
const PASS  = process.argv[3];

if (!EMAIL || !PASS) {
  console.error("Usage: node scripts/seed.mjs <email> <password>");
  process.exit(1);
}

// ─── Load .env.local ─────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

let envContent;
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  console.error("Could not read .env.local — run this from the project root.");
  process.exit(1);
}

const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

// ─── Firebase init ────────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Workers to seed ─────────────────────────────────────────────────────────

const WORKERS = [
  { name: "Carmela Ferrara",   plannedHoursPerWeek: 40 },
  { name: "Lina Giacobbi",     plannedHoursPerWeek: 40 },
  { name: "Joy Nwoke",         plannedHoursPerWeek: 40 },
  { name: "Lakbira Sahiri",    plannedHoursPerWeek: 40 },
  { name: "Imran Muhammad",    plannedHoursPerWeek: 40 },
  { name: "Kateryna Nahorna",  plannedHoursPerWeek: 40 },
  { name: "Prova Utente",      plannedHoursPerWeek: 0  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`Signing in as ${EMAIL}…`);
  let uid;
  try {
    const cred = await signInWithEmailAndPassword(auth, EMAIL, PASS);
    uid = cred.user.uid;
    console.log("Signed in.");
  } catch (e) {
    if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found") {
      console.log("Account not found — creating it now…");
      const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASS);
      uid = cred.user.uid;
      console.log(`Created Auth account for ${EMAIL}.`);
    } else {
      throw e;
    }
  }

  // Ensure the kiosk user has a Firestore profile with role "employee"
  const kioskRef = doc(db, "users", uid);
  const kioskSnap = await getDocs(query(collection(db, "users"), where("email", "==", EMAIL)));
  if (kioskSnap.empty) {
    await setDoc(kioskRef, {
      name: "Kiosk Tablet",
      email: EMAIL,
      role: "employee",
      plannedHoursPerWeek: 0,
      active: true,
      createdAt: serverTimestamp(),
    });
    console.log("Created Firestore profile for kiosk account.");
  }

  // Find existing workers to avoid duplicates
  const existing = await getDocs(
    query(collection(db, "users"), where("role", "==", "worker"))
  );
  const existingNames = new Set(existing.docs.map((d) => d.data().name));

  let created = 0;
  for (const w of WORKERS) {
    if (existingNames.has(w.name)) {
      console.log(`  ⏭  ${w.name} already exists — skipped`);
      continue;
    }
    const ref = doc(collection(db, "users"));
    await setDoc(ref, {
      name:               w.name,
      email:              "",
      role:               "worker",
      plannedHoursPerWeek: w.plannedHoursPerWeek,
      active:             true,
      createdAt:          serverTimestamp(),
    });
    console.log(`  ✓  Created: ${w.name} (id: ${ref.id})`);
    created++;
  }

  console.log(`\nDone. ${created} worker(s) created, ${WORKERS.length - created} skipped.`);
  process.exit(0);
})().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

