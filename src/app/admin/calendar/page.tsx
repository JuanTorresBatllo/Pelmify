"use client";

import { useEffect, useMemo, useState } from "react";
import { listAllEntries, listAllSchedules, listUsers, upsertSchedule, deleteSchedule } from "@/lib/db";
import { Schedule, TimeEntry, UserProfile } from "@/types";
import { CalendarView } from "@/components/CalendarView";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";

export default function AdminCalendarPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [hours, setHours] = useState(8);
  const [isDayOff, setIsDayOff] = useState(false);
  const [note, setNote] = useState("");

  const refresh = async () => {
    const [u, e, s] = await Promise.all([listUsers(), listAllEntries(), listAllSchedules()]);
    setUsers(u);
    setEntries(e);
    setSchedules(s);
    if (!selectedUser && u.length) setSelectedUser(u[0].id);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEntries = useMemo(
    () => entries.filter((e) => e.userId === selectedUser),
    [entries, selectedUser]
  );
  const filteredSchedules = useMemo(
    () => schedules.filter((s) => s.userId === selectedUser),
    [schedules, selectedUser]
  );

  const openEditor = (date: string) => {
    const existing = filteredSchedules.find((s) => s.date === date);
    setEditingDate(date);
    setHours(existing?.plannedHours ?? 8);
    setIsDayOff(existing?.isDayOff ?? false);
    setNote(existing?.note ?? "");
  };

  const save = async () => {
    if (!editingDate || !selectedUser) return;
    await upsertSchedule({
      userId: selectedUser,
      date: editingDate,
      plannedHours: isDayOff ? 0 : hours,
      isDayOff,
      note,
    });
    setEditingDate(null);
    await refresh();
  };

  const clear = async () => {
    if (!editingDate || !selectedUser) return;
    const existing = filteredSchedules.find((s) => s.date === editingDate);
    if (existing) await deleteSchedule(existing.id);
    setEditingDate(null);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Calendar</h1>
        <p className="text-slate-500">
          View worked hours and plan schedules / days off. Click any day to edit.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelectedUser(u.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              selectedUser === u.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {u.name}
          </button>
        ))}
      </div>

      <CalendarView
        entries={filteredEntries}
        schedules={filteredSchedules}
        onDayClick={openEditor}
        title={users.find((u) => u.id === selectedUser)?.name}
      />

      {editingDate && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Schedule for{" "}
                <span className="text-brand-600">
                  {new Date(editingDate).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </h3>
              <button onClick={() => setEditingDate(null)} className="text-slate-500 text-sm">
                Cancel
              </button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDayOff}
                  onChange={(e) => setIsDayOff(e.target.checked)}
                />
                Day off
              </label>
              {!isDayOff && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Planned hours
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-28 rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={save}>Save</Button>
                <Button variant="secondary" onClick={clear}>
                  Clear schedule
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
