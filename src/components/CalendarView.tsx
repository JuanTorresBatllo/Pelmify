"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDateKey, formatMinutesAsHours } from "@/lib/utils";
import { TimeEntry, Schedule } from "@/types";

interface Props {
  entries: TimeEntry[];
  schedules: Schedule[];
  onDayClick?: (dateKey: string) => void;
  title?: string;
}

export function CalendarView({ entries, schedules, onDayClick, title }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [cursor]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.date, (map.get(e.date) || 0) + e.totalMinutes);
    }
    return map;
  }, [entries]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule>();
    for (const s of schedules) map.set(s.date, s);
    return map;
  }, [schedules]);

  const todayKey = formatDateKey(new Date());

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          {title && <div className="text-sm font-medium text-slate-600">{title}</div>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
            className={cn(
              "px-3 text-sm rounded-lg font-medium transition-colors capitalize",
              cursor.getFullYear() === new Date().getFullYear() &&
              cursor.getMonth() === new Date().getMonth()
                ? "bg-brand-600 text-white"
                : "hover:bg-slate-100"
            )}
          >
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs font-medium text-slate-500 px-2 pt-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 p-2">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = formatDateKey(d);
          const workedMin = entriesByDate.get(key) || 0;
          const schedule = schedulesByDate.get(key);
          const isToday = key === todayKey;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <button
              key={i}
              onClick={() => onDayClick?.(key)}
              className={cn(
                "text-left rounded-lg border p-2 min-h-[72px] transition-colors",
                isToday ? "border-brand-500 bg-brand-50" : "border-slate-100 hover:bg-slate-50",
                schedule?.isDayOff && "bg-slate-100",
                isWeekend && !schedule && "bg-slate-50/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", isToday && "text-brand-700")}>
                  {d.getDate()}
                </span>
                {schedule?.isDayOff && (
                  <span className="text-[10px] uppercase font-bold text-slate-500">Off</span>
                )}
              </div>
              {workedMin > 0 && (
                <div className="mt-1 inline-block text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                  {formatMinutesAsHours(workedMin)}
                </div>
              )}
              {schedule && !schedule.isDayOff && (
                <div className="mt-1 inline-block text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  plan {schedule.plannedHours}h
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
