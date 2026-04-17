"use client";

import { useEffect, useMemo, useState } from "react";
import { listUsers, listAllEntries } from "@/lib/db";
import { TimeEntry, UserProfile } from "@/types";
import { Card, CardBody } from "@/components/Card";
import { formatMinutesAsHours, formatTime, toDate } from "@/lib/utils";
import { Users, Clock, CalendarCheck, Timer } from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [u, e] = await Promise.all([listUsers(), listAllEntries()]);
      setUsers(u);
      setEntries(e);
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const todayEntries = entries.filter((e) => e.date === today);
    const activeNow = entries.filter((e) => !e.clockOut);
    const totalMinToday = todayEntries.reduce((s, e) => s + e.totalMinutes, 0);
    return {
      employees: users.filter((u) => u.active !== false).length,
      clockedIn: activeNow.length,
      totalHoursToday: totalMinToday,
      entriesToday: todayEntries.length,
    };
  }, [users, entries, today]);

  const recent = entries.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-500">Overview of your team&apos;s time tracking.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Employees" value={stats.employees} color="bg-blue-100 text-blue-700" />
        <StatCard icon={Clock} label="Clocked in now" value={stats.clockedIn} color="bg-emerald-100 text-emerald-700" />
        <StatCard icon={CalendarCheck} label="Entries today" value={stats.entriesToday} color="bg-amber-100 text-amber-700" />
        <StatCard icon={Timer} label="Hours today" value={formatMinutesAsHours(stats.totalHoursToday)} color="bg-purple-100 text-purple-700" />
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 font-semibold">Recent activity</div>
        <CardBody className="p-0">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((e) => (
                <li key={e.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{e.userName}</div>
                    <div className="text-slate-500">
                      {e.date} · {formatTime(toDate(e.clockIn))} →{" "}
                      {e.clockOut ? formatTime(toDate(e.clockOut)) : "ongoing"}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">
                    {e.clockOut ? formatMinutesAsHours(e.totalMinutes) : (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse align-middle" />
                    )}
                    {!e.clockOut && <span className="text-emerald-600 text-xs font-medium">Active</span>}
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardBody>
    </Card>
  );
}
