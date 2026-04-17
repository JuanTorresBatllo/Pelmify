/**
 * Seed script — adds random time entries for an employee.
 *
 * Usage (from the project root):
 *   node scripts/seed.mjs <adminEmail> <adminPassword>
 *
 * Example:
 *   node scripts/seed.mjs juant.batllo@gmail.com mypassword
 *
 * Requires Node 18+ (uses built-in fetch).
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Args ────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.argv[2];
const ADMIN_PASS = process.argv[3];
const TARGET_EMAIL = "jbarrinatxe@gmail.com"; // employee to seed

if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error("Usage: node scripts/seed.mjs <adminEmail> <adminPassword>");
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

// ─── Firebase init ───────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6; // not Sunday or Saturday
}

/** Returns all weekdays between fromDate and toDate (inclusive) */
function getWorkingDays(fromDate, toDate) {
  const days = [];
  const cur = new Date(fromDate);
  while (cur <= toDate) {
    if (isWeekday(cur)) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Build a realistic time entry for a given date */
function buildEntry(date, userId, userName) {
  // Clock-in: between 8:00 and 9:30
  const clockInHour = rand(8, 9);
  const clockInMin = rand(0, 59);
  const clockIn = new Date(date);
  clockIn.setHours(clockInHour, clockInMin, 0, 0);

  // Clock-out: between 16:30 and 18:30
  const clockOutHour = rand(16, 18);
  const clockOutMin = clockOutHour === 16 ? rand(30, 59) : rand(0, 30);
  const clockOut = new Date(date);
  clockOut.setHours(clockOutHour, clockOutMin, 0, 0);

  // Lunch break: 30-60 min around noon (80% chance of having a break)
  const hasBreak = Math.random() < 0.8;
  const breaks = [];
  if (hasBreak) {
    const breakStartHour = 12;
    const breakStartMin = rand(0, 30);
    const breakDurationMin = rand(30, 60);

    const breakStart = new Date(date);
    breakStart.setHours(breakStartHour, breakStartMin, 0, 0);

    const breakEnd = new Date(breakStart);
    breakEnd.setMinutes(breakEnd.getMinutes() + breakDurationMin);

    breaks.push({
      start: Timestamp.fromDate(breakStart),
      end: Timestamp.fromDate(breakEnd),
    });
  }

  // Compute total worked minutes
  const totalRaw = (clockOut - clockIn) / 60000;
  const breakMin = breaks.reduce((sum, b) => {
    return sum + (b.end.toDate() - b.start.toDate()) / 60000;
  }, 0);
  const totalMinutes = Math.max(0, totalRaw - breakMin);

  return {
    userId,
    userName,
    date: formatDateKey(date),
    clockIn: Timestamp.fromDate(clockIn),
    clockOut: Timestamp.fromDate(clockOut),
    breaks,
    totalMinutes: Math.round(totalMinutes),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Sign in as admin
  console.log(`Signing in as ${ADMIN_EMAIL}…`);
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
  console.log("Signed in ✓");

  // 2. Find the target employee
  console.log(`Looking up user ${TARGET_EMAIL}…`);
  const usersSnap = await getDocs(
    query(collection(db, "users"), where("email", "==", TARGET_EMAIL))
  );
  if (usersSnap.empty) {
    console.error(`No user found with email ${TARGET_EMAIL}`);
    process.exit(1);
  }
  const userDoc = usersSnap.docs[0];
  const userId = userDoc.id;
  const userName = userDoc.data().name;
  console.log(`Found: ${userName} (${userId}) ✓`);

  // 3. Generate working days for Feb, March, and April 2026 (up to today)
  const ranges = [
    { from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) },  // Feb
    { from: new Date(2026, 2, 1), to: new Date(2026, 2, 31) },  // March
    { from: new Date(2026, 3, 1), to: new Date(2026, 3, 16) },  // April (up to yesterday)
  ];

  const allWorkingDays = ranges.flatMap(({ from, to }) =>
    getWorkingDays(from, to)
  );

  // 4. Randomly skip ~15% of days (sick/holiday/etc.)
  const daysToSeed = allWorkingDays.filter(() => Math.random() > 0.15);

  console.log(
    `Seeding ${daysToSeed.length} entries (out of ${allWorkingDays.length} working days)…`
  );

  // 5. Write entries
  let count = 0;
  for (const date of daysToSeed) {
    const entry = buildEntry(date, userId, userName);
    await addDoc(collection(db, "timeEntries"), entry);
    count++;
    process.stdout.write(`\r  ${count}/${daysToSeed.length} written…`);
  }

  console.log(`\nDone! ${count} time entries added for ${userName} ✓`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
