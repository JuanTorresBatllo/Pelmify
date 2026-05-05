import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { TimeEntry, UserProfile, Schedule, Break } from "@/types";
import { formatDateKey, minutesBetween, toDate } from "./utils";

// ----- Users -----

export async function listUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserProfile, "id">) }));
}

export async function listWorkers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<UserProfile, "id">) }))
    .filter((u) => u.role === "worker")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateUser(userId: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", userId), data);
}

export async function deleteUserDoc(userId: string) {
  // Note: this only removes the Firestore profile. The Firebase Auth user must be
  // deleted manually from the Firebase console or via an Admin SDK function.
  await deleteDoc(doc(db, "users", userId));
}

// ----- Time Entries -----

export async function getOpenEntry(userId: string): Promise<TimeEntry | null> {
  const q = query(
    collection(db, "timeEntries"),
    where("userId", "==", userId),
    where("clockOut", "==", null),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<TimeEntry, "id">) };
}

export async function clockIn(user: UserProfile): Promise<string> {
  const now = new Date();
  const ref = await addDoc(collection(db, "timeEntries"), {
    userId: user.id,
    userName: user.name,
    date: formatDateKey(now),
    clockIn: Timestamp.fromDate(now),
    clockOut: null,
    breaks: [],
    totalMinutes: 0,
  });
  return ref.id;
}

export async function clockOut(entry: TimeEntry) {
  const now = new Date();
  const start = toDate(entry.clockIn)!;
  let breakMin = 0;
  for (const b of entry.breaks || []) {
    const bs = toDate(b.start);
    const be = toDate(b.end) || now;
    if (bs) breakMin += minutesBetween(bs, be);
  }
  const total = Math.max(0, minutesBetween(start, now) - breakMin);
  await updateDoc(doc(db, "timeEntries", entry.id), {
    clockOut: Timestamp.fromDate(now),
    totalMinutes: total,
    breaks: (entry.breaks || []).map((b) => ({
      start: b.start,
      end: b.end || Timestamp.fromDate(now),
    })),
  });
}

export async function startBreak(entry: TimeEntry) {
  const breaks: Break[] = [...(entry.breaks || []), { start: Timestamp.fromDate(new Date()), end: null }];
  await updateDoc(doc(db, "timeEntries", entry.id), { breaks });
}

export async function endBreak(entry: TimeEntry) {
  const breaks = [...(entry.breaks || [])];
  for (let i = breaks.length - 1; i >= 0; i--) {
    if (!breaks[i].end) {
      breaks[i] = { start: breaks[i].start, end: Timestamp.fromDate(new Date()) };
      break;
    }
  }
  await updateDoc(doc(db, "timeEntries", entry.id), { breaks });
}

export async function listEntriesForUser(
  userId: string,
  fromDateKey?: string,
  toDateKey?: string
): Promise<TimeEntry[]> {
  const snap = await getDocs(query(collection(db, "timeEntries"), where("userId", "==", userId)));
  let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TimeEntry, "id">) }));
  if (fromDateKey) rows = rows.filter((r) => r.date >= fromDateKey);
  if (toDateKey) rows = rows.filter((r) => r.date <= toDateKey);
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

export async function listAllEntries(
  fromDateKey?: string,
  toDateKey?: string
): Promise<TimeEntry[]> {
  const snap = await getDocs(collection(db, "timeEntries"));
  let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TimeEntry, "id">) }));
  if (fromDateKey) rows = rows.filter((r) => r.date >= fromDateKey);
  if (toDateKey) rows = rows.filter((r) => r.date <= toDateKey);
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

// ----- Schedules -----

export async function listSchedulesForUser(userId: string): Promise<Schedule[]> {
  const snap = await getDocs(query(collection(db, "schedules"), where("userId", "==", userId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Schedule, "id">) }));
}

export async function listAllSchedules(): Promise<Schedule[]> {
  const snap = await getDocs(collection(db, "schedules"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Schedule, "id">) }));
}

export async function upsertSchedule(s: Omit<Schedule, "id">) {
  const id = `${s.userId}_${s.date}`;
  await setDoc(doc(db, "schedules", id), s);
  return id;
}

export async function deleteSchedule(id: string) {
  await deleteDoc(doc(db, "schedules", id));
}
