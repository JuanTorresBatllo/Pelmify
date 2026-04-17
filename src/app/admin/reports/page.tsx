"use client";

import { useEffect, useMemo, useState } from "react";
import { listAllEntries, listUsers } from "@/lib/db";
import { TimeEntry, UserProfile } from "@/types";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { formatMinutesAsHours, formatTime, toDate } from "@/lib/utils";
import { exportEntriesToCSV, exportEntriesToPDF } from "@/lib/export";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [u, e] = await Promise.all([listUsers(), listAllEntries()]);
      setUsers(u);
      setEntries(e);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.date >= from &&
          e.date <= to &&
          (userId ? e.userId === userId : true) &&
          e.clockOut
      ),
    [entries, from, to, userId]
  );

  const byUser = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const e of filtered) {
      const cur = map.get(e.userId) || { name: e.userName, total: 0, count: 0 };
      cur.total += e.totalMinutes;
      cur.count += 1;
      map.set(e.userId, cur);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const grandTotal = filtered.reduce((s, e) => s + e.totalMinutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-slate-500">Filter by date range and employee, then export.</p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Employee</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All employees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportEntriesToCSV(filtered, `report-${from}-to-${to}`)}
            >
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportEntriesToPDF(filtered, `Report ${from} to ${to}`)}
            >
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Total hours</div>
            <div className="text-2xl font-bold">{formatMinutesAsHours(grandTotal)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Entries</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs uppercase text-slate-500">Employees</div>
            <div className="text-2xl font-bold">{byUser.length}</div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 font-semibold">By employee</div>
        <CardBody className="p-0">
          {byUser.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No data in this range.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {byUser.map(([id, info]) => (
                <li key={id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{info.name}</div>
                    <div className="text-slate-500">{info.count} entries</div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatMinutesAsHours(info.total)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 font-semibold">All entries</div>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No entries.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Employee</th>
                    <th className="text-left px-5 py-3">In</th>
                    <th className="text-left px-5 py-3">Out</th>
                    <th className="text-right px-5 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td className="px-5 py-3">{e.date}</td>
                      <td className="px-5 py-3 font-medium">{e.userName}</td>
                      <td className="px-5 py-3">{formatTime(toDate(e.clockIn))}</td>
                      <td className="px-5 py-3">{formatTime(toDate(e.clockOut))}</td>
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
