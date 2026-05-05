"use client";

import { useEffect, useState, useCallback } from "react";
import { listWorkers, getOpenEntry, clockIn, clockOut } from "@/lib/db";
import { UserProfile, TimeEntry } from "@/types";
import { Play, Square, ArrowLeft } from "lucide-react";
import { formatTime, toDate } from "@/lib/utils";

interface WorkerStatus {
  worker: UserProfile;
  openEntry: TimeEntry | null;
}

const AVATAR_COLORS = [
  "bg-brand-100 text-brand-700",
  "bg-moss-300/40 text-moss-700",
  "bg-ochre-400/25 text-ochre-600",
  "bg-cream-300 text-brand-600",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function KioskPage() {
  const [statuses, setStatuses] = useState<WorkerStatus[]>([]);
  const [selected, setSelected] = useState<WorkerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    const workers = await listWorkers();
    const results = await Promise.all(
      workers.map(async (w) => ({ worker: w, openEntry: await getOpenEntry(w.id) }))
    );
    setStatuses(results);
    // Keep the selected card in sync after an action
    if (selected) {
      const updated = results.find((r) => r.worker.id === selected.worker.id);
      if (updated) setSelected(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.worker.id]);

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClockIn = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await clockIn(selected.worker);
      await refresh();
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!selected?.openEntry) return;
    setBusy(true);
    try {
      await clockOut(selected.openEntry);
      await refresh();
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  // ── Detail view (after tapping a worker card) ──────────────────────────────
  if (selected) {
    const isClockedIn = !!selected.openEntry;
    const colorIdx = statuses.findIndex((s) => s.worker.id === selected.worker.id);

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 px-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-700 self-start transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-center">
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold mx-auto mb-5 ${
              AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]
            }`}
          >
            {getInitials(selected.worker.name)}
          </div>
          <h2 className="text-3xl font-display text-brand-700">{selected.worker.name}</h2>
          <p className={`mt-2 text-base font-medium ${isClockedIn ? "text-emerald-600" : "text-slate-400"}`}>
            {isClockedIn
              ? `Clocked in at ${formatTime(toDate(selected.openEntry!.clockIn))}`
              : "Not clocked in"}
          </p>
        </div>

        {!isClockedIn ? (
          <button
            onClick={handleClockIn}
            disabled={busy}
            className="flex items-center gap-3 px-12 py-6 rounded-2xl bg-emerald-600 text-white text-2xl font-semibold shadow-lg hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Play className="w-7 h-7" />
            Clock in
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={busy}
            className="flex items-center gap-3 px-12 py-6 rounded-2xl bg-red-600 text-white text-2xl font-semibold shadow-lg hover:bg-red-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Square className="w-7 h-7" />
            Clock out
          </button>
        )}
      </div>
    );
  }

  // ── Worker picker (main kiosk screen) ─────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-7xl font-bold tabular-nums text-brand-700">
          {now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-brand-400 mt-2 text-lg capitalize">
          {now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <p className="text-center text-brand-500 font-medium">
        Seleziona il tuo nome per timbrare
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-w-2xl mx-auto">
        {statuses.map(({ worker, openEntry }, i) => (
          <button
            key={worker.id}
            onClick={() => setSelected({ worker, openEntry })}
            className={`relative rounded-2xl p-6 flex flex-col items-center gap-3 bg-white shadow-soft hover:shadow-lift active:scale-95 transition-all border-2 ${
              openEntry ? "border-emerald-400" : "border-cream-200"
            }`}
          >
            {openEntry && (
              <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                AVATAR_COLORS[i % AVATAR_COLORS.length]
              }`}
            >
              {getInitials(worker.name)}
            </div>
            <span className="text-sm font-semibold text-brand-700 text-center leading-tight">
              {worker.name}
            </span>
            <span className={`text-xs font-medium ${openEntry ? "text-emerald-600" : "text-slate-400"}`}>
              {openEntry ? "In servizio" : "Non timbrato"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

