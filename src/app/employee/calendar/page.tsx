"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listEntriesForUser, listSchedulesForUser } from "@/lib/db";
import { TimeEntry, Schedule } from "@/types";
import { CalendarView } from "@/components/CalendarView";

export default function EmployeeCalendarPage() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [e, s] = await Promise.all([
        listEntriesForUser(profile.id),
        listSchedulesForUser(profile.id),
      ]);
      setEntries(e);
      setSchedules(s);
    })();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <p className="text-slate-500">
          Your hours worked, planned schedule, and days off.
        </p>
      </div>
      <CalendarView entries={entries} schedules={schedules} />
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
          Worked
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          Planned
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-slate-200" />
          Day off
        </div>
      </div>
    </div>
  );
}
