"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { Play, Square, Coffee, CoffeeIcon } from "lucide-react";
import {
  getOpenEntry,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  listEntriesForUser,
} from "@/lib/db";
import { TimeEntry } from "@/types";
import { formatMinutesAsHours, formatTime, minutesBetween, toDate } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { profile } = useAuth();
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null);
  const [recent, setRecent] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const [open, entries] = await Promise.all([
      getOpenEntry(profile.id),
      listEntriesForUser(profile.id),
    ]);
    setOpenEntry(open);
    setRecent(entries.filter((e) => e.clockOut).slice(0, 7));
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!profile) return null;

  const onBreak = openEntry?.breaks?.some((b) => !b.end);

  const elapsedMin = openEntry
    ? (() => {
        const start = toDate(openEntry.clockIn)!;
        let breakMin = 0;
        for (const b of openEntry.breaks || []) {
          const bs = toDate(b.start);
          const be = toDate(b.end) || now;
          if (bs) breakMin += minutesBetween(bs, be);
        }
        return Math.max(0, minutesBetween(start, now) - breakMin);
      })()
    : 0;

  const handleClockIn = async () => {
    setBusy(true);
    try {
      await clockIn(profile);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const handleClockOut = async () => {
    if (!openEntry) return;
    setBusy(true);
    try {
      await clockOut(openEntry);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const handleBreakToggle = async () => {
    if (!openEntry) return;
    setBusy(true);
    try {
      if (onBreak) await endBreak(openEntry);
      else await startBreak(openEntry);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {profile.name.split(" ")[0]} 👋</h1>
        <p className="text-slate-500">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <Card>
        <CardBody className="text-center py-10">
          <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">
            {openEntry ? (onBreak ? "On break" : "Clocked in") : "Not clocked in"}
          </div>
          <div className="text-6xl font-bold tabular-nums mb-2">
            {openEntry ? formatMinutesAsHours(elapsedMin) : formatTime(now)}
          </div>
          {openEntry && (
            <div className="text-sm text-slate-500">
              Started at {formatTime(toDate(openEntry.clockIn))}
              {openEntry.breaks.length > 0 &&
                ` • ${openEntry.breaks.length} break${openEntry.breaks.length > 1 ? "s" : ""}`}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!openEntry ? (
              <Button size="lg" onClick={handleClockIn} disabled={busy}>
                <Play className="w-4 h-4" /> Clock in
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant={onBreak ? "primary" : "secondary"}
                  onClick={handleBreakToggle}
                  disabled={busy}
                >
                  {onBreak ? (
                    <>
                      <CoffeeIcon className="w-4 h-4" /> End break
                    </>
                  ) : (
                    <>
                      <Coffee className="w-4 h-4" /> Start break
                    </>
                  )}
                </Button>
                <Button size="lg" variant="danger" onClick={handleClockOut} disabled={busy || onBreak}>
                  <Square className="w-4 h-4" /> Clock out
                </Button>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No entries yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((e) => (
                <li key={e.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{e.date}</div>
                    <div className="text-slate-500">
                      {formatTime(toDate(e.clockIn))} → {formatTime(toDate(e.clockOut))}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">
                    {formatMinutesAsHours(e.totalMinutes)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
