// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { getAllResidents } from "../../firebase/residents";
import { getPendingVisitorRequests } from "../../firebase/visitorService";
import { getOnDutyGuards } from "../../firebase/guards";
import { getRecentLogs } from "../../firebase/entryLogs";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatLogTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatLogDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit" });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">{label}</p>
      <div className="flex items-end gap-2">
        <span className={`text-5xl font-black ${accent ?? "text-gray-900"}`}>
          {value !== null ? value : "—"}
        </span>
      </div>
      {sub && (
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{sub}</p>
      )}
    </div>
  );
}

// ── Action Badge ──────────────────────────────────────────────────────────────
function ActionBadge({ action }) {
  const styles = {
    entry:        "bg-green-50 text-green-700 border-green-200",
    exit:         "bg-red-50 text-red-500 border-red-200",
    manual_close: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border rounded ${styles[action] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {action === "manual_close" ? "MC" : action}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [insideCount, setInsideCount]   = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [onDutyGuards, setOnDutyGuards] = useState([]);
  const [recentLogs, setRecentLogs]     = useState([]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const residents = await getAllResidents();
        setInsideCount(residents.filter((r) => r.isInside).length);

        const pending = await getPendingVisitorRequests();
        setPendingCount(pending.length);

        const guards = await getOnDutyGuards();
        setOnDutyGuards(guards);

        const logs = await getRecentLogs(8);
        setRecentLogs(logs);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-5xl font-black uppercase tracking-tight text-gray-900">
          Live Monitor
        </h1>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <KPICard
          label="Currently Inside"
          value={insideCount}
          sub="Residents in building"
          accent={insideCount > 0 ? "text-gray-900" : "text-gray-400"}
        />
        <KPICard
          label="Pending Visitor Requests"
          value={pendingCount}
          sub={pendingCount > 0 ? "Awaiting approval" : "All requests handled"}
          accent={pendingCount > 0 ? "text-yellow-600" : "text-gray-400"}
        />
        <KPICard
          label="Active Guards on Duty"
          value={onDutyGuards.length}
          sub={onDutyGuards.length > 0 ? "Currently on shift" : "No guards on shift"}
          accent={onDutyGuards.length > 0 ? "text-green-700" : "text-gray-400"}
        />
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-[1fr_300px] gap-6">

        {/* ── LEFT: Recent Activity Feed ── */}
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

            <div className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
              {["Time", "Subject", "ID", "Type", "Action"].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {h}
                </span>
              ))}
            </div>

            {recentLogs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">
                  No activity yet
                </p>
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-4 px-5 py-3.5 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-900">{formatLogTime(log.timestamp)}</p>
                    <p className="text-[10px] text-gray-400">{formatLogDate(log.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 truncate">{log.subjectName}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{log.residentUnit ?? "—"}</p>
                  </div>
                  <p className="text-xs font-mono text-gray-500 truncate">{log.subjectId}</p>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border w-fit ${
                    log.type === "resident"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                    {log.type}
                  </span>
                  <ActionBadge action={log.action} />
                </div>
              ))
            )}

            <div className="px-5 py-3 border-t border-gray-100">
              <a
                href="/admin/logs"
                className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors font-semibold"
              >
                View full log history →
              </a>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Guard Status ── */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 mb-4">
              Guard Status
            </h2>
            <div className="flex flex-col gap-2">
              {onDutyGuards.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-6 text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">
                    No guards on duty
                  </p>
                </div>
              ) : (
                onDutyGuards.map((guard) => (
                  <div
                    key={guard.id}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                        {guard.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {guard.post} · {guard.shiftStart}–{guard.shiftEnd}
                      </p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {pendingCount > 0 && (
            <a href="/admin/visitors">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors cursor-pointer">
                <p className="text-[10px] uppercase tracking-widest text-yellow-600 font-bold mb-1">
                  Pending Requests
                </p>
                <p className="text-2xl font-black text-yellow-700">{pendingCount}</p>
                <p className="text-[10px] text-yellow-600 mt-1 uppercase tracking-widest">
                  Visitor requests awaiting approval →
                </p>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}