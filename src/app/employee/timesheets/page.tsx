"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listEntriesForUser } from "@/lib/db";
import { TimeEntry } from "@/types";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { formatMinutesAsHours, formatTime, toDate } from "@/lib/utils";
import { exportEntriesToCSV, exportEntriesToPDF } from "@/lib/export";
import { Download } from "lucide-react";

type Range = "week" | "month" | "all";

function isoWeekStart(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function EmployeeTimesheetsPage() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [range, setRange] = useState<Range>("week");

  useEffect(() => {
    if (!profile) return;
    listEntriesForUser(profile.id).then(setEntries);
  }, [profile]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (range === "all") return entries;
    let from: Date;
    if (range === "week") from = isoWeekStart(now);
    else from = new Date(now.getFullYear(), now.getMonth(), 1);
    return entries.filter((e) => {
      const d = toDate(e.clockIn);
      return d && d >= from;
    });
  }, [entries, range]);

  const total = filtered.reduce((s, e) => s + e.totalMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <p className="text-slate-500">Your clock-ins and hours worked.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportEntriesToCSV(filtered, `timesheet-${profile?.name}`)}
          >
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportEntriesToPDF(filtered, `Timesheet — ${profile?.name}`)}
          >
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["week", "month", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              range === r ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {r === "week" ? "This week" : r === "month" ? "This month" : "All"}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Total: <span className="text-brand-600">{formatMinutesAsHours(total)}</span>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No entries in this range.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Clock in</th>
                    <th className="text-left px-5 py-3">Clock out</th>
                    <th className="text-left px-5 py-3">Breaks</th>
                    <th className="text-right px-5 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td className="px-5 py-3 font-medium">{e.date}</td>
                      <td className="px-5 py-3">{formatTime(toDate(e.clockIn))}</td>
                      <td className="px-5 py-3">{formatTime(toDate(e.clockOut))}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {(e.breaks || []).length}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {formatMinutesAsHours(e.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
