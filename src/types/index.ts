import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "employee" | "worker";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plannedHoursPerWeek: number;
  createdAt: Timestamp | Date;
  active: boolean;
}

export interface Break {
  start: Timestamp | Date;
  end: Timestamp | Date | null;
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  clockIn: Timestamp | Date;
  clockOut: Timestamp | Date | null;
  breaks: Break[];
  totalMinutes: number; // computed on clock-out
  note?: string;
}

export interface Schedule {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  plannedHours: number;
  isDayOff: boolean;
  note?: string;
}
