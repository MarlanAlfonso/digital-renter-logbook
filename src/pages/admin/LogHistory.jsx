// src/pages/admin/LogHistory.jsx
import { useState, useEffect, useCallback } from "react";
import {
  getAllEntryLogs,
  getLogsByDateRange,
  getLogsByUnit,
  getLogsByGuard,
} from "../../firebase/entryLogs";
import { getAllGuards } from "../../firebase/guards";
import { Search, Download, RefreshCw, X, ChevronUp, ChevronDown } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return { date: "—", time: "—" };
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return {
    date: d.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
  };
}

function exportToCSV(logs) {
  const headers = [
    "Timestamp", "Type", "Subject ID", "Subject Name",
    "Unit", "Action", "ID Type", "ID Number",
    "Guard", "Blacklisted", "Manually Closed",
  ];
  const rows = logs.map((l) => {
    const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date();
    return [
      ts.toISOString(),
      l.type,
      l.subjectId,
      l.subjectName,
      l.residentUnit,
      l.action,
      l.idTypePresented,
      l.idNumberPresented,
      l.guardName,
      l.isBlacklisted ? "YES" : "NO",
      l.isManuallyClosed ? "YES" : "NO",
    ].map((v) => `"${v ?? ""}"`).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `entry_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Badge components ──────────────────────────────────────────────────────────
function ActionBadge({ action }) {
  const styles = {
    entry:        "bg-green-50 text-green-700 border-green-200",
    exit:         "bg-red-50 text-red-600 border-red-200",
    manual_close: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  const labels = { entry: "Entry", exit: "Exit", manual_close: "Manual Close" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded ${styles[action] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {labels[action] ?? action}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded ${
      type === "resident"
        ? "bg-gray-900 text-white border-gray-900"
        : "bg-gray-100 text-gray-600 border-gray-200"
    }`}>
      {type}
    </span>
  );
}

// ── Sort Header ───────────────────────────────────────────────────────────────
function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors"
    >
      {label}
      <span className="flex flex-col">
        <ChevronUp size={9} className={active && sortDir === "asc" ? "text-gray-900" : "text-gray-300"} />
        <ChevronDown size={9} className={active && sortDir === "desc" ? "text-gray-900" : "text-gray-300"} />
      </span>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LogHistory() {
  const [logs, setLogs]             = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [guards, setGuards]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("all");     // all | resident | visitor
  const [filterAction, setFilterAction] = useState("all"); // all | entry | exit | manual_close
  const [filterGuard, setFilterGuard]   = useState("all");
  const [filterUnit, setFilterUnit]     = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");

  // Sort
  const [sortField, setSortField]   = useState("timestamp");
  const [sortDir, setSortDir]       = useState("desc");

  // Pagination
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 20;

  const loadLogs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let data;
      if (dateFrom && dateTo) {
        const start = new Date(dateFrom);
        const end   = new Date(dateTo); end.setHours(23, 59, 59);
        data = await getLogsByDateRange(start, end);
      } else if (filterUnit.trim()) {
        data = await getLogsByUnit(filterUnit.trim().toUpperCase());
      } else if (filterGuard !== "all") {
        data = await getLogsByGuard(filterGuard);
      } else {
        data = await getAllEntryLogs();
      }
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, filterUnit, filterGuard]);

  useEffect(() => {
    async function loadGuards() {
      try { setGuards(await getAllGuards()); } catch { /* silent */ }
    }
    loadGuards();
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Client-side filtering + sorting
  useEffect(() => {
    let result = [...logs];

    if (filterType !== "all")   result = result.filter((l) => l.type === filterType);
    if (filterAction !== "all") result = result.filter((l) => l.action === filterAction);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.subjectName?.toLowerCase().includes(q) ||
        l.subjectId?.toLowerCase().includes(q) ||
        l.guardName?.toLowerCase().includes(q) ||
        l.residentUnit?.toLowerCase().includes(q) ||
        l.idNumberPresented?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let av, bv;
      if (sortField === "timestamp") {
        av = a.timestamp?.toDate?.() ?? new Date(0);
        bv = b.timestamp?.toDate?.() ?? new Date(0);
      } else {
        av = (a[sortField] ?? "").toString().toLowerCase();
        bv = (b[sortField] ?? "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    setFiltered(result);
    setPage(0);
  }, [logs, search, filterType, filterAction, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const clearFilters = () => {
    setSearch(""); setFilterType("all"); setFilterAction("all");
    setFilterGuard("all"); setFilterUnit(""); setDateFrom(""); setDateTo("");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const hasActiveFilters = search || filterType !== "all" || filterAction !== "all" ||
    filterGuard !== "all" || filterUnit || dateFrom || dateTo;

  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Log History</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {filtered.length} records
            {hasActiveFilters && <span className="ml-2 text-gray-900 font-bold">· Filters active</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => exportToCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end">

          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Search</label>
            <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2 rounded-lg">
              <Search size={12} className="text-gray-300 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, ID, unit, guard..."
                className="bg-transparent text-sm w-full outline-none text-gray-700 placeholder-gray-300"
              />
            </div>
          </div>

          {/* Type filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors"
            >
              <option value="all">All Types</option>
              <option value="resident">Resident</option>
              <option value="visitor">Visitor</option>
            </select>
          </div>

          {/* Action filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors"
            >
              <option value="all">All Actions</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
              <option value="manual_close">Manual Close</option>
            </select>
          </div>

          {/* Guard filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Guard</label>
            <select
              value={filterGuard}
              onChange={(e) => setFilterGuard(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors"
            >
              <option value="all">All Guards</option>
              {guards.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors pb-2"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Date range + Unit — second row */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 mt-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Unit</label>
            <input
              type="text"
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              placeholder="e.g. 301A"
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors uppercase"
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        {/* Table Header */}
        <div className="grid grid-cols-[160px_1fr_1fr_80px_80px_1fr_1fr_80px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <SortHeader label="Timestamp"   field="timestamp"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Subject"     field="subjectName"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="ID"          field="subjectId"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Type"        field="type"         sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Action"      field="action"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Guard"       field="guardName"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">ID Presented</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Flags</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pageRows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">No logs found</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-gray-400 underline">Clear filters</button>
            )}
          </div>
        ) : (
          pageRows.map((log) => {
            const { date, time } = formatTimestamp(log.timestamp);
            return (
              <div
                key={log.id}
                className="grid grid-cols-[160px_1fr_1fr_80px_80px_1fr_1fr_80px] gap-3 px-5 py-3.5 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors"
              >
                {/* Timestamp */}
                <div>
                  <p className="text-xs font-bold text-gray-900">{date}</p>
                  <p className="text-[10px] text-gray-400">{time}</p>
                </div>

                {/* Subject */}
                <div>
                  <p className="text-sm font-bold text-gray-900 truncate">{log.subjectName}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{log.residentUnit ?? "—"}</p>
                </div>

                {/* Subject ID */}
                <p className="text-xs font-mono text-gray-600 truncate">{log.subjectId}</p>

                {/* Type */}
                <TypeBadge type={log.type} />

                {/* Action */}
                <ActionBadge action={log.action} />

                {/* Guard */}
                <p className="text-xs text-gray-700 truncate">{log.guardName ?? "—"}</p>

                {/* ID Presented */}
                <div>
                  <p className="text-xs text-gray-700">{log.idTypePresented}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{log.idNumberPresented}</p>
                </div>

                {/* Flags */}
                <div className="flex flex-col gap-1">
                  {log.isBlacklisted && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      BL
                    </span>
                  )}
                  {log.isManuallyClosed && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded">
                      MC
                    </span>
                  )}
                  {!log.isBlacklisted && !log.isManuallyClosed && (
                    <span className="text-[9px] text-gray-300">—</span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              Page {page + 1} of {totalPages} · {filtered.length} total records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs font-semibold uppercase tracking-widest border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs font-semibold uppercase tracking-widest border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}