"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { listUsers, listSchedulesForUser, upsertSchedule, deleteSchedule } from "@/lib/db";
import { UserProfile, Schedule } from "@/types";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { cn, formatDateKey } from "@/lib/utils";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)} ${sunday.getFullYear()}`;
}

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayPlan {
  dateKey: string;
  date: Date;
  label: string;
  short: string;
  isWeekend: boolean;
  schedule: Schedule | null;
  // local editable state
  hours: number;
  isDayOff: boolean;
  saved: boolean; // true briefly after saving
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [days, setDays] = useState<DayPlan[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [modifying, setModifying] = useState<Set<string>>(new Set()); // past days unlocked for editing

  const todayKey = formatDateKey(new Date());
  const isPast = (dateKey: string) => dateKey < todayKey;
  const isLocked = (dateKey: string) => isPast(dateKey) && !modifying.has(dateKey);

  const toggleModify = (dateKey: string) => {
    setModifying((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  // ── Load users ──────────────────────────────────────────────────────────────
  useEffect(() => {
    listUsers().then((u) => {
      const employees = u.filter((x) => x.active !== false);
      setUsers(employees);
      if (employees.length) setSelectedUserId(employees[0].id);
    });
  }, []);

  // ── Load schedules for selected user ────────────────────────────────────────
  const loadSchedules = useCallback(async () => {
    if (!selectedUserId) return;
    setModifying(new Set()); // reset locks on employee change
    const s = await listSchedulesForUser(selectedUserId);
    setSchedules(s);
  }, [selectedUserId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // ── Build day grid whenever week or schedules change ─────────────────────────
  useEffect(() => {
    setModifying(new Set()); // reset locks on week change
    const built: DayPlan[] = DAY_LABELS.map((label, i) => {
      const date = addDays(weekStart, i);
      const dateKey = formatDateKey(date);
      const schedule = schedules.find((s) => s.date === dateKey) ?? null;
      const isWeekend = i >= 5;
      return {
        dateKey,
        date,
        label,
        short: DAY_SHORT[i],
        isWeekend,
        schedule,
        hours: schedule ? (schedule.isDayOff ? 0 : schedule.plannedHours) : 8,
        isDayOff: schedule ? schedule.isDayOff : false,
        saved: false,
      };
    });
    setDays(built);
  }, [weekStart, schedules]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updateDay = (dateKey: string, patch: Partial<DayPlan>) => {
    setDays((prev) =>
      prev.map((d) => (d.dateKey === dateKey ? { ...d, ...patch, saved: false } : d))
    );
  };

  const saveDay = async (day: DayPlan) => {
    if (!selectedUserId) return;
    setSaving(day.dateKey);
    await upsertSchedule({
      userId: selectedUserId,
      date: day.dateKey,
      plannedHours: day.isDayOff ? 0 : day.hours,
      isDayOff: day.isDayOff,
    });
    setDays((prev) =>
      prev.map((d) => (d.dateKey === day.dateKey ? { ...d, saved: true } : d))
    );
    // Lock past day again after saving
    if (isPast(day.dateKey)) {
      setModifying((prev) => { const n = new Set(prev); n.delete(day.dateKey); return n; });
    }
    setSaving(null);
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  const applyStandard = async () => {
    if (!selectedUserId) return;
    for (const day of days) {
      await upsertSchedule({
        userId: selectedUserId,
        date: day.dateKey,
        plannedHours: 8,
        isDayOff: false,
      });
    }
    await loadSchedules();
  };

  const copyPreviousWeek = async () => {
    if (!selectedUserId) return;
    const prevMonday = addDays(weekStart, -7);
    const prevDays = DAY_LABELS.map((_, i) => formatDateKey(addDays(prevMonday, i)));
    const prevSchedules = schedules.filter((s) => prevDays.includes(s.date));
    for (const day of days) {
      const idx = DAY_LABELS.findIndex((_, i) => formatDateKey(addDays(prevMonday, i)) === day.dateKey.replace(
        formatDateKey(weekStart).slice(0, 8),
        formatDateKey(prevMonday).slice(0, 8)
      ));
      // simpler: find by day-of-week offset
      const dayIndex = days.indexOf(day);
      const prevKey = formatDateKey(addDays(prevMonday, dayIndex));
      const prev = prevSchedules.find((s) => s.date === prevKey);
      await upsertSchedule({
        userId: selectedUserId,
        date: day.dateKey,
        plannedHours: prev ? prev.plannedHours : 8,
        isDayOff: prev ? prev.isDayOff : false,
      });
    }
    await loadSchedules();
  };

  const clearWeek = async () => {
    if (!selectedUserId) return;
    for (const day of days) {
      if (day.schedule) await deleteSchedule(day.schedule.id);
    }
    await loadSchedules();
  };

  const [savingAll, setSavingAll] = useState(false);
  const [allSaved, setAllSaved] = useState(false);

  const saveAll = async () => {
    if (!selectedUserId) return;
    setSavingAll(true);
    for (const day of days) {
      await upsertSchedule({
        userId: selectedUserId,
        date: day.dateKey,
        plannedHours: day.isDayOff ? 0 : day.hours,
        isDayOff: day.isDayOff,
      });
    }
    await loadSchedules();
    setSavingAll(false);
    setAllSaved(true);
    setTimeout(() => setAllSaved(false), 2000);
  };

  const totalPlanned = days.filter((d) => !d.isDayOff).reduce((s, d) => s + d.hours, 0);
  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Planning</h1>
        <p className="text-slate-500">Set planned hours per day, per employee, for any week.</p>
      </div>

      {/* Employee selector */}
      <div className="flex flex-wrap gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              selectedUserId === u.id
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Week</div>
          <div className="font-semibold text-lg">{formatWeekLabel(weekStart)}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="p-2 rounded-lg hover:bg-slate-100"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium transition-colors",
              formatDateKey(weekStart) === formatDateKey(getMondayOfWeek(new Date()))
                ? "bg-brand-600 text-white"
                : "hover:bg-slate-100"
            )}
          >
            {formatWeekLabel(weekStart)}
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="p-2 rounded-lg hover:bg-slate-100"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copyPreviousWeek}>
          <Copy className="w-4 h-4" /> Copy previous week
        </Button>
        <Button size="sm" onClick={saveAll} disabled={savingAll}>
          {allSaved ? (
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> All saved</span>
          ) : savingAll ? "Saving…" : (
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Save all</span>
          )}
        </Button>
      </div>

      {/* Day cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {days.map((day) => (
          <Card
            key={day.dateKey}
            className={cn(
              "transition-colors",
              day.isWeekend && "bg-slate-50",
              day.isDayOff && "opacity-60",
              isLocked(day.dateKey) && "opacity-75"
            )}
          >
            <CardBody className="p-4 space-y-3">
              {/* Day label + date */}
              <div>
                <div className="font-bold text-sm text-slate-800">
                  {day.label}
                </div>
                <div className="text-xs text-slate-400">
                  {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>

              {/* Past day — Modify toggle */}
              {isPast(day.dateKey) && (
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modifying.has(day.dateKey)}
                    onChange={() => toggleModify(day.dateKey)}
                    className="rounded"
                  />
                  Modify
                </label>
              )}

              {/* Day off toggle — hidden when locked */}
              {!isLocked(day.dateKey) && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={day.isDayOff}
                    onChange={(e) => updateDay(day.dateKey, { isDayOff: e.target.checked })}
                    className="rounded"
                  />
                  Day off
                </label>
              )}

              {/* Hours input — hidden when locked or day off */}
              {!isLocked(day.dateKey) && !day.isDayOff && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Hours</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateDay(day.dateKey, { hours: Math.max(0, day.hours - 0.5) })}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={day.hours}
                      onChange={(e) => updateDay(day.dateKey, { hours: Number(e.target.value) })}
                      className="w-14 text-center rounded border border-slate-300 px-1 py-1 text-sm font-semibold"
                    />
                    <button
                      onClick={() => updateDay(day.dateKey, { hours: Math.min(24, day.hours + 0.5) })}
                      className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Locked past day — show saved pill */}
              {isLocked(day.dateKey) && (
                <div className="w-full py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" />
                    {day.isDayOff ? "Day off" : `${day.hours}h planned`}
                  </span>
                </div>
              )}

              {/* Save button — only when not locked */}
              {!isLocked(day.dateKey) && (
                <button
                  onClick={() => saveDay(day)}
                  disabled={saving === day.dateKey}
                  className={cn(
                    "w-full py-1.5 rounded-lg text-xs font-medium transition-colors",
                    day.saved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  )}
                >
                  {day.saved ? (
                    <span className="flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  ) : saving === day.dateKey ? (
                    "Saving…"
                  ) : (
                    "Save"
                  )}
                </button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Week summary */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Total planned this week</div>
            <div className="text-2xl font-bold">
              {totalPlanned}h{" "}
              <span className="text-sm font-normal text-slate-500">
                ({days.filter((d) => !d.isDayOff).length} working days)
              </span>
            </div>
          </div>
          {selectedUser && (
            <div className="text-sm text-slate-500">
              Employee: <span className="font-medium text-slate-800">{selectedUser.name}</span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
