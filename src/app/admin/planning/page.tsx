"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Copy, Check, Users } from "lucide-react";
import {
  listUsers,
  listAllSchedules,
  listSchedulesForUser,
  upsertSchedule,
} from "@/lib/db";
import { UserProfile, Schedule } from "@/types";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { cn, formatDateKey } from "@/lib/utils";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
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
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayPlan {
  dateKey: string;
  date: Date;
  label: string;
  short: string;
  isWeekend: boolean;
  schedule: Schedule | null;
  hours: number;
  isDayOff: boolean;
  saved: boolean;
}

export default function PlanningPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [days, setDays] = useState<DayPlan[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [modifying, setModifying] = useState<Set<string>>(new Set());

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

  const weekDateKeys = useMemo(
    () => DAY_LABELS.map((_, i) => formatDateKey(addDays(weekStart, i))),
    [weekStart]
  );

  // Load users
  useEffect(() => {
    listUsers().then((u) => {
      const employees = u.filter((x) => x.active !== false);
      setUsers(employees);
      if (employees.length) setSelectedUserId(employees[0].id);
    });
  }, []);

  // Load ALL schedules (team overview)
  const loadAllSchedules = useCallback(async () => {
    const s = await listAllSchedules();
    setAllSchedules(s);
  }, []);

  useEffect(() => {
    loadAllSchedules();
  }, [loadAllSchedules]);

  // Load schedules for selected user
  const loadSchedules = useCallback(async () => {
    if (!selectedUserId) return;
    setModifying(new Set());
    const s = await listSchedulesForUser(selectedUserId);
    setSchedules(s);
  }, [selectedUserId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Build day grid
  useEffect(() => {
    setModifying(new Set());
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

  // Team overview
  const teamOverview = useMemo(() => {
    return users.map((u) => {
      const userSchedules = allSchedules.filter(
        (s) => s.userId === u.id && weekDateKeys.includes(s.date)
      );
      const perDay = weekDateKeys.map((dk) => {
        const sched = userSchedules.find((s) => s.date === dk);
        if (!sched) return null;
        if (sched.isDayOff) return "off" as const;
        return sched.plannedHours;
      });
      const totalPlanned = userSchedules
        .filter((s) => !s.isDayOff)
        .reduce((sum, s) => sum + s.plannedHours, 0);
      return { user: u, perDay, totalPlanned };
    });
  }, [users, allSchedules, weekDateKeys]);

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
    if (isPast(day.dateKey)) {
      setModifying((prev) => {
        const n = new Set(prev);
        n.delete(day.dateKey);
        return n;
      });
    }
    setSaving(null);
    await loadAllSchedules();
  };

  const copyPreviousWeek = async () => {
    if (!selectedUserId) return;
    const prevMonday = addDays(weekStart, -7);
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const prevKey = formatDateKey(addDays(prevMonday, i));
      const prev = schedules.find((s) => s.date === prevKey);
      await upsertSchedule({
        userId: selectedUserId,
        date: day.dateKey,
        plannedHours: prev ? prev.plannedHours : 8,
        isDayOff: prev ? prev.isDayOff : false,
      });
    }
    await loadSchedules();
    await loadAllSchedules();
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
    await loadAllSchedules();
    setSavingAll(false);
    setAllSaved(true);
    setTimeout(() => setAllSaved(false), 2000);
  };

  const totalPlanned = days.filter((d) => !d.isDayOff).reduce((s, d) => s + d.hours, 0);
  const selectedUser = users.find((u) => u.id === selectedUserId);
  const contractHours = selectedUser?.plannedHoursPerWeek ?? 40;
  const remaining = contractHours - totalPlanned;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-brand-700">Planning</h1>
        <p className="text-brand-400">
          Set planned hours per day, per employee, for any week.
        </p>
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
                ? "bg-brand-600 text-cream-50 shadow-soft"
                : "bg-cream-100 text-brand-600 hover:bg-cream-200 border border-cream-200"
            )}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-brand-400 uppercase tracking-wider mb-0.5">
            Week
          </div>
          <div className="font-display text-lg text-brand-700">
            {formatWeekLabel(weekStart)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="p-2 rounded-lg hover:bg-cream-100"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-brand-600" />
          </button>
          <button
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium transition-colors",
              formatDateKey(weekStart) ===
                formatDateKey(getMondayOfWeek(new Date()))
                ? "bg-brand-600 text-cream-50"
                : "hover:bg-cream-100 text-brand-600"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="p-2 rounded-lg hover:bg-cream-100"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5 text-brand-600" />
          </button>
        </div>
      </div>

      {/* TEAM OVERVIEW */}
      <Card>
        <CardBody className="p-0">
          <div className="px-6 py-3 border-b border-cream-200/80 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            <span className="font-display text-sm text-brand-700">
              Team overview — this week
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-cream-50 text-brand-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Employee</th>
                  {DAY_SHORT.map((d, i) => (
                    <th
                      key={d}
                      className={cn(
                        "text-center px-2 py-2 font-medium",
                        i >= 5 && "bg-cream-100/60"
                      )}
                    >
                      {d}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 font-medium">Total</th>
                  <th className="text-center px-3 py-2 font-medium">Contract</th>
                  <th className="text-center px-3 py-2 font-medium">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200/60">
                {teamOverview.map(({ user: u, perDay, totalPlanned: tp }) => {
                  const contract = u.plannedHoursPerWeek ?? 40;
                  const diff = contract - tp;
                  const isSelected = u.id === selectedUserId;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-brand-50/60" : "hover:bg-cream-50"
                      )}
                    >
                      <td
                        className={cn(
                          "px-4 py-2 font-medium whitespace-nowrap",
                          isSelected ? "text-brand-700" : "text-brand-600"
                        )}
                      >
                        {u.name}
                      </td>
                      {perDay.map((val, i) => (
                        <td
                          key={i}
                          className={cn(
                            "text-center px-2 py-2",
                            i >= 5 && "bg-cream-100/30"
                          )}
                        >
                          {val === null ? (
                            <span className="text-brand-300">—</span>
                          ) : val === "off" ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-cream-200 text-brand-400 font-medium">
                              off
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "inline-block min-w-[2rem] px-1.5 py-0.5 rounded font-semibold",
                                val > 0
                                  ? "bg-moss-300/30 text-moss-700"
                                  : "text-brand-300"
                              )}
                            >
                              {val}h
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="text-center px-3 py-2 font-semibold text-brand-700">
                        {tp}h
                      </td>
                      <td className="text-center px-3 py-2 text-brand-400">
                        {contract}h
                      </td>
                      <td
                        className={cn(
                          "text-center px-3 py-2 font-semibold",
                          diff > 0
                            ? "text-ochre-600"
                            : diff < 0
                              ? "text-red-600"
                              : "text-moss-700"
                        )}
                      >
                        {diff > 0
                          ? `${diff}h left`
                          : diff < 0
                            ? `${Math.abs(diff)}h over`
                            : "✓"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* CONTRACT COUNTER for selected employee */}
      {selectedUser && (
        <Card
          className={cn(
            remaining < 0
              ? "border-red-200"
              : remaining === 0
                ? "border-moss-300"
                : ""
          )}
        >
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-brand-400 uppercase tracking-wider">
                {selectedUser.name}&apos;s week
              </div>
              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                <span className="text-2xl font-display text-brand-700">
                  {totalPlanned}h
                </span>
                <span className="text-brand-400">planned</span>
                <span className="text-brand-300 mx-1">/</span>
                <span className="text-lg font-semibold text-brand-500">
                  {contractHours}h
                </span>
                <span className="text-brand-400">contract</span>
              </div>
            </div>
            <div
              className={cn(
                "text-right px-4 py-2 rounded-xl font-display text-lg",
                remaining > 0 && "bg-ochre-400/15 text-ochre-600",
                remaining === 0 && "bg-moss-300/25 text-moss-700",
                remaining < 0 && "bg-red-50 text-red-700"
              )}
            >
              {remaining > 0 ? (
                <>{remaining}h remaining</>
              ) : remaining === 0 ? (
                <>✓ Complete</>
              ) : (
                <>{Math.abs(remaining)}h over contract</>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copyPreviousWeek}>
          <Copy className="w-4 h-4" /> Copy previous week
        </Button>
        <Button size="sm" onClick={saveAll} disabled={savingAll}>
          {allSaved ? (
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4" /> All saved
            </span>
          ) : savingAll ? (
            "Saving…"
          ) : (
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4" /> Save all
            </span>
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
              day.isWeekend && "bg-cream-50/60",
              day.isDayOff && "opacity-60",
              isLocked(day.dateKey) && "opacity-75"
            )}
          >
            <CardBody className="p-4 space-y-3">
              <div>
                <div className="font-bold text-sm text-brand-700">{day.label}</div>
                <div className="text-xs text-brand-400">
                  {day.date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              {isPast(day.dateKey) && (
                <label className="flex items-center gap-2 text-xs text-brand-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modifying.has(day.dateKey)}
                    onChange={() => toggleModify(day.dateKey)}
                    className="rounded"
                  />
                  Modify
                </label>
              )}

              {!isLocked(day.dateKey) && (
                <label className="flex items-center gap-2 text-xs text-brand-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={day.isDayOff}
                    onChange={(e) =>
                      updateDay(day.dateKey, { isDayOff: e.target.checked })
                    }
                    className="rounded"
                  />
                  Day off
                </label>
              )}

              {!isLocked(day.dateKey) && !day.isDayOff && (
                <div>
                  <label className="block text-xs text-brand-400 mb-1">
                    Hours
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateDay(day.dateKey, {
                          hours: Math.max(0, day.hours - 0.5),
                        })
                      }
                      className="w-7 h-7 rounded bg-cream-100 hover:bg-cream-200 text-brand-600 font-bold flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={day.hours}
                      onChange={(e) =>
                        updateDay(day.dateKey, { hours: Number(e.target.value) })
                      }
                      className="w-14 text-center rounded border border-cream-200 px-1 py-1 text-sm font-semibold"
                    />
                    <button
                      onClick={() =>
                        updateDay(day.dateKey, {
                          hours: Math.min(24, day.hours + 0.5),
                        })
                      }
                      className="w-7 h-7 rounded bg-cream-100 hover:bg-cream-200 text-brand-600 font-bold flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {isLocked(day.dateKey) && (
                <div className="w-full py-1.5 rounded-lg text-xs font-medium bg-moss-300/20 text-moss-700 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" />
                    {day.isDayOff ? "Day off" : `${day.hours}h planned`}
                  </span>
                </div>
              )}

              {!isLocked(day.dateKey) && (
                <button
                  onClick={() => saveDay(day)}
                  disabled={saving === day.dateKey}
                  className={cn(
                    "w-full py-1.5 rounded-lg text-xs font-medium transition-colors",
                    day.saved
                      ? "bg-moss-300/25 text-moss-700"
                      : "bg-brand-600 text-cream-50 hover:bg-brand-700 disabled:opacity-50"
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
    </div>
  );
}
