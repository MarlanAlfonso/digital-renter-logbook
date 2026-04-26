// src/pages/resident/MyLogs.jsx
import { useState, useMemo } from "react";
import { Calendar, Filter } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

function formatDateLabel(d) {
  if (!d) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
}

function formatTimeLabel(d) {
  if (!d) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

// ── Action Pill ───────────────────────────────────────────────────────────────
function ActionPill({ action }) {
  const config = {
    entry:        { label: "Entry",  color: "bg-green-100 text-green-700" },
    exit:         { label: "Exit",   color: "bg-red-50 text-red-600"      },
    manual_close: { label: "MC",     color: "bg-yellow-50 text-yellow-700" },
  };
  const { label, color } = config[action] ?? config.entry;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${color}`}>
      {label}
    </span>
  );
}

// ── Group logs by date ────────────────────────────────────────────────────────
function groupByDate(logs) {
  const groups = {};
  logs.forEach((log) => {
    const d = toDate(log.timestamp);
    if (!d) return;
    const key = startOfDay(d).toISOString();
    if (!groups[key]) groups[key] = { date: d, logs: [] };
    groups[key].logs.push(log);
  });
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

// ── Pair entry/exit logs for the table ───────────────────────────────────────
// For each day, try to pair entry logs with subsequent exit logs.
function pairLogs(dayLogs) {
  const entries = dayLogs.filter((l) => l.action === "entry" || l.action === "manual_close");
  const exits   = dayLogs.filter((l) => l.action === "exit");
  const rows    = [];

  entries.forEach((entry) => {
    const entryTime = toDate(entry.timestamp);
    // Find the closest exit after this entry
    const matchedExit = exits.find((ex) => {
      const exitTime = toDate(ex.timestamp);
      return exitTime > entryTime;
    });

    rows.push({
      id:          entry.id,
      date:        toDate(entry.timestamp),
      timeIn:      toDate(entry.timestamp),
      timeOut:     matchedExit ? toDate(matchedExit.timestamp) : null,
      action:      entry.action,
      guardName:   entry.guardName,
      // Linked visitor — if this entry was for a visitor type
      linkedVisitor: entry.type === "visitor" ? entry.subjectName : null,
    });
  });

  // Add any exits that weren't matched (edge case)
  exits.forEach((ex) => {
    const alreadyUsed = rows.some((r) => r.timeOut?.getTime() === toDate(ex.timestamp)?.getTime());
    if (!alreadyUsed) {
      rows.push({
        id:           ex.id + "_exit",
        date:         toDate(ex.timestamp),
        timeIn:       null,
        timeOut:      toDate(ex.timestamp),
        action:       "exit",
        guardName:    ex.guardName,
        linkedVisitor: null,
      });
    }
  });

  return rows.sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
const PRESETS = ["Daily", "Weekly", "Custom"];

// ── Main Export ───────────────────────────────────────────────────────────────
export default function MyLogs({ logs }) {
  const [preset, setPreset]     = useState("Daily");
  const [customFrom, setFrom]   = useState("");
  const [customTo, setTo]       = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const filtered = useMemo(() => {
    const today     = startOfDay(new Date());
    const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);

    return logs.filter((log) => {
      const d = toDate(log.timestamp);
      if (!d) return false;
      if (preset === "Daily")  return d >= today && d <= endOfDay(new Date());
      if (preset === "Weekly") return d >= weekAgo && d <= endOfDay(new Date());
      if (preset === "Custom" && customFrom && customTo) {
        const from = startOfDay(new Date(customFrom));
        const to   = endOfDay(new Date(customTo));
        return d >= from && d <= to;
      }
      return true;
    });
  }, [logs, preset, customFrom, customTo]);

  const today     = startOfDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const grouped = groupByDate(filtered);
  const totalEntries = filtered.filter((l) => l.action === "entry").length;
  const totalExits   = filtered.filter((l) => l.action === "exit").length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">My Logs</h2>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
          {filtered.length} records · {totalEntries} entries · {totalExits} exits
        </p>
      </div>

      {/* Filter row */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 flex-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setPreset(p); setShowCustom(p === "Custom"); }}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${
                  preset === p
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date pickers */}
        {showCustom && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">From</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full border border-gray-200 bg-white text-xs pl-8 pr-3 py-2.5 rounded-xl outline-none focus:border-gray-900 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">To</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full border border-gray-200 bg-white text-xs pl-8 pr-3 py-2.5 rounded-xl outline-none focus:border-gray-900 transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log groups */}
      {grouped.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-300 font-bold">No records for this period</p>
        </div>
      ) : (
        grouped.map(({ date, logs: dayLogs }) => {
          const rows = pairLogs(dayLogs);
          const isToday    = startOfDay(date).getTime() === today.getTime();
          const isYesterday = startOfDay(date).getTime() === yesterday.getTime();
          const dateLabel  = isToday ? "Today"
            : isYesterday ? "Yesterday"
            : formatDateLabel(date);

          return (
            <div key={date.toISOString()} className="space-y-2">
              {/* Date group header */}
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dateLabel}</p>
                <div className="flex-1 h-px bg-gray-200" />
                <p className="text-[9px] text-gray-400 uppercase tracking-widest">{rows.length} record{rows.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Table card */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  {["Date", "Time In", "Time Out", "Visitor"].map((h) => (
                    <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-2 px-4 py-3.5 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Date */}
                    <div className="flex items-center gap-2">
                      <ActionPill action={row.action} />
                    </div>

                    {/* Time In */}
                    <span className="text-xs font-semibold text-gray-700">
                      {row.timeIn ? formatTimeLabel(row.timeIn) : "—"}
                    </span>

                    {/* Time Out */}
                    <span className={`text-xs font-semibold ${row.timeOut ? "text-gray-700" : "text-gray-300"}`}>
                      {row.timeOut ? formatTimeLabel(row.timeOut) : "—"}
                    </span>

                    {/* Linked Visitor */}
                    <span className="text-[10px] text-gray-500 truncate">
                      {row.linkedVisitor ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}