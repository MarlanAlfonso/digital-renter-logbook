// src/pages/admin/GuardManagement.jsx
import { useState, useEffect } from "react";
import { getAllGuards, addGuard, updateGuard, setGuardStatus, isGuardOnShift } from "../../firebase/guards";
import { getAllPosts, addPost, deletePost } from "../../firebase/posts";
import { getAllShifts, addShift, deleteShift, dateKeyOf } from "../../firebase/shifts";
import {
  Plus, Pencil, ToggleLeft, ToggleRight,
  X, Check, Trash2, MapPin, Search,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(dt) {
  if (!dt) return "—";
  const [, timePart] = dt.split("T");
  const [hh, mm] = timePart.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12  = hh % 12 || 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

function fmtDateShort(dt) {
  if (!dt) return "—";
  const [datePart] = dt.split("T");
  const [, m, d]   = datePart.split("-").map(Number);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${monthNames[m - 1]} ${d}`;
}

function fmtShiftRange(shiftStart, shiftEnd) {
  if (!shiftStart || !shiftEnd) return "—";
  const startDate = dateKeyOf(shiftStart);
  const endDate   = dateKeyOf(shiftEnd);
  if (startDate === endDate) return `${fmtTime(shiftStart)} – ${fmtTime(shiftEnd)}`;
  return `${fmtDateShort(shiftStart)} · ${fmtTime(shiftStart)} – ${fmtDateShort(shiftEnd)} · ${fmtTime(shiftEnd)}`;
}

// LOCAL-time date helpers — avoids UTC off-by-one for UTC+8 and similar zones
function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function shiftTouchesDay(shift, dayKey) {
  const startDay = dateKeyOf(shift.shiftStart);
  const endDay   = dateKeyOf(shift.shiftEnd);
  return startDay <= dayKey && endDay >= dayKey;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">{label}</p>
      <span className={`text-5xl font-black ${accent ?? "text-gray-900"}`}>{value ?? "—"}</span>
      {sub && <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
      status === "active"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-100 text-gray-400 border-gray-200"
    }`}>
      {status}
    </span>
  );
}

function DutyBadge({ guard }) {
  const onDuty = guard.status === "active" && isGuardOnShift(guard.shiftStart, guard.shiftEnd);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
      onDuty ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${onDuty ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
      {onDuty ? "On Duty" : "Off Duty"}
    </span>
  );
}

// ── Add Shift Modal ───────────────────────────────────────────────────────────
function AddShiftModal({ guards, posts, prefillStart, shifts, onSave, onClose }) {
  const defaultStart = prefillStart ?? toDatetimeLocal(new Date());
  const defaultEnd = (() => {
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 8);
    return toDatetimeLocal(d);
  })();

  const [form, setForm] = useState({
    guardId: "", shiftStart: defaultStart, shiftEnd: defaultEnd, post: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.guardId)                    { setError("Select a guard."); return; }
    if (!form.shiftStart)                 { setError("Shift start is required."); return; }
    if (!form.shiftEnd)                   { setError("Shift end is required."); return; }
    if (form.shiftEnd <= form.shiftStart) { setError("Shift end must be after shift start."); return; }

    const guard    = guards.find((g) => g.id === form.guardId);
    const conflict = shifts.find(
      (s) => s.guardId === form.guardId &&
             form.shiftStart < s.shiftEnd &&
             form.shiftEnd   > s.shiftStart
    );
    if (conflict) {
      setError(`${guard?.name ?? "This guard"} already has a shift during this time: ${fmtShiftRange(conflict.shiftStart, conflict.shiftEnd)}.`);
      return;
    }

    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.message ?? "Failed to save shift."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Add Shift</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Guard</label>
            <select value={form.guardId} onChange={set("guardId")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors">
              <option value="">Select guard...</option>
              {guards.filter((g) => g.status === "active").map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Post</label>
            <select value={form.post} onChange={set("post")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors">
              <option value="">Select post (optional)</option>
              {posts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Shift Start</label>
            <input type="datetime-local" value={form.shiftStart} onChange={set("shiftStart")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Shift End</label>
            <input type="datetime-local" value={form.shiftEnd} onChange={set("shiftEnd")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
          </div>

          {form.shiftStart && form.shiftEnd && form.shiftEnd > form.shiftStart && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Preview</p>
              <p className="text-xs font-mono font-bold text-gray-700">
                {fmtShiftRange(form.shiftStart, form.shiftEnd)}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 rounded-lg transition-colors">
              <Check size={13} /> {saving ? "Saving..." : "Add Shift"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 text-xs transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Day Detail Modal ──────────────────────────────────────────────────────────
function DayDetailModal({ dayKey, shiftsOnDay, guards, onDelete, onAddShift, onClose }) {
  const date  = (() => { const [y,m,d] = dayKey.split("-").map(Number); return new Date(y, m-1, d); })();
  const label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Shifts</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
          {shiftsOnDay.length === 0 ? (
            <p className="text-xs uppercase tracking-widest text-gray-300 text-center py-4">No shifts scheduled</p>
          ) : (
            shiftsOnDay.map((s) => {
              const guard = guards.find((g) => g.id === s.guardId);
              return (
                <div key={s.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{guard?.name ?? "Unknown Guard"}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{fmtShiftRange(s.shiftStart, s.shiftEnd)}</p>
                    {s.post && (
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={9} /> {s.post}
                      </p>
                    )}
                  </div>
                  <button onClick={() => onDelete(s.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={() => { onClose(); onAddShift(dayKey); }}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-800 rounded-xl transition-colors">
            <Plus size={13} /> Add Shift for This Day
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Monthly View ──────────────────────────────────────────────────────────────
function MonthlyView({ cursor, setCursor, today, shifts, guards, setDayModal }) {
  const year        = cursor.getFullYear();
  const month       = cursor.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : new Date(year, month, i - firstDay + 1)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-black uppercase tracking-widest text-gray-900">
          {MONTHS[month]} {year}
        </p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[9px] font-bold uppercase tracking-widest text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="bg-white min-h-[72px]" />;
          const key       = toKey(date);
          const dayShifts = shifts.filter((s) => shiftTouchesDay(s, key));
          const isToday   = key === today;
          return (
            <div
              key={key}
              onClick={() => setDayModal(key)}
              className={`bg-white min-h-[72px] p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? "ring-2 ring-inset ring-gray-900" : ""}`}
            >
              <p className={`text-[10px] font-black mb-1 ${isToday ? "text-gray-900" : "text-gray-500"}`}>
                {date.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayShifts.slice(0, 2).map((s) => {
                  const g = guards.find((gg) => gg.id === s.guardId);
                  return (
                    <div key={s.id} className="bg-gray-900 text-white rounded px-1 py-0.5">
                      <p className="text-[8px] font-bold uppercase truncate">{g?.name ?? "—"}</p>
                    </div>
                  );
                })}
                {dayShifts.length > 2 && (
                  <p className="text-[8px] text-gray-400 font-bold">+{dayShifts.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Weekly View ───────────────────────────────────────────────────────────────
function WeeklyView({ cursor, setCursor, today, shifts, guards, onDeleteShift, setDayModal }) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(cursor);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => { const d = new Date(cursor); d.setDate(d.getDate() - 7); setCursor(d); };
  const nextWeek = () => { const d = new Date(cursor); d.setDate(d.getDate() + 7); setCursor(d); };
  const goToday  = () => setCursor(new Date());

  const rangeLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-gray-900">{rangeLabel}</p>
          {toKey(cursor) !== today && (
            <button onClick={goToday}
              className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-700 font-bold transition-colors mt-0.5">
              Back to Today
            </button>
          )}
        </div>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {weekDays.map((date) => {
          const key       = toKey(date);
          const dayShifts = shifts.filter((s) => shiftTouchesDay(s, key));
          const isToday   = key === today;
          const dayName   = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

          return (
            <div key={key} className={`bg-white border rounded-xl overflow-hidden ${isToday ? "border-gray-900" : "border-gray-200"}`}>
              <div
                className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? "bg-gray-900" : "bg-gray-50"}`}
                onClick={() => setDayModal(key)}
              >
                <p className={`text-xs font-black uppercase tracking-widest ${isToday ? "text-white" : "text-gray-700"}`}>
                  {dayName}
                  {isToday && <span className="ml-2 text-[9px] text-gray-400">Today</span>}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isToday ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {dayShifts.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {dayShifts.map((s) => {
                    const g         = guards.find((gg) => gg.id === s.guardId);
                    const isOvernight = dateKeyOf(s.shiftStart) !== dateKeyOf(s.shiftEnd);
                    return (
                      <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{g?.name ?? "—"}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {fmtShiftRange(s.shiftStart, s.shiftEnd)}
                            {isOvernight && (
                              <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                                Overnight
                              </span>
                            )}
                          </p>
                          {s.post && (
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <MapPin size={9} /> {s.post}
                            </p>
                          )}
                        </div>
                        <button onClick={() => onDeleteShift(s.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Daily View ────────────────────────────────────────────────────────────────
function DailyView({ cursor, setCursor, today, shifts, guards, onDeleteShift, openAddShift }) {
  const key       = toKey(cursor);
  const dayShifts = shifts.filter((s) => shiftTouchesDay(s, key));
  const isToday   = key === today;
  const label     = cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const prevDay = () => { const d = new Date(cursor); d.setDate(d.getDate() - 1); setCursor(d); };
  const nextDay = () => { const d = new Date(cursor); d.setDate(d.getDate() + 1); setCursor(d); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevDay} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-gray-900">{label}</p>
          {!isToday && (
            <button onClick={() => setCursor(new Date())}
              className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-700 font-bold transition-colors mt-0.5">
              Back to Today
            </button>
          )}
          {isToday && <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Today</p>}
        </div>
        <button onClick={nextDay} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1.6fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
          {["Guard", "Shift", "Post", ""].map((h, i) => (
            <span key={i} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{h}</span>
          ))}
        </div>

        {dayShifts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">No shifts scheduled</p>
            <button onClick={() => openAddShift(`${key}T00:00`)}
              className="mt-4 flex items-center gap-2 mx-auto text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">
              <Plus size={13} /> Add Shift
            </button>
          </div>
        ) : (
          dayShifts.map((s) => {
            const g         = guards.find((gg) => gg.id === s.guardId);
            const isOvernight = dateKeyOf(s.shiftStart) !== dateKeyOf(s.shiftEnd);
            return (
              <div key={s.id} className="grid grid-cols-[1.2fr_1.6fr_0.8fr_auto] gap-4 px-5 py-3.5 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{g?.name ?? "—"}</p>
                  <p className="text-[10px] text-gray-400">{g?.email ?? ""}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-700">{fmtShiftRange(s.shiftStart, s.shiftEnd)}</p>
                  {isOvernight && (
                    <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest mt-0.5 inline-block">
                      Overnight
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">{s.post || "—"}</span>
                <button onClick={() => onDeleteShift(s.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {dayShifts.length > 0 && (
        <button onClick={() => openAddShift(`${key}T00:00`)}
          className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">
          <Plus size={13} /> Add Another Shift
        </button>
      )}
    </div>
  );
}

// ── Add Guard Modal ───────────────────────────────────────────────────────────
function AddGuardModal({ posts, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", post: "", shiftStart: "", shiftEnd: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim())  { setError("Name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!form.post)         { setError("Please select a post."); return; }
    if (!form.shiftStart)   { setError("Shift start is required."); return; }
    if (!form.shiftEnd)     { setError("Shift end is required."); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) {
      setError(err.message?.includes("already") ? "A guard with this email already exists." : "Failed to add guard.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Add Guard</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
          {[
            { label: "Full Name",    key: "name",  type: "text",  placeholder: "e.g. Juan dela Cruz" },
            { label: "Google Email", key: "email", type: "email", placeholder: "guard@gmail.com" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
              <input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder}
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Post</label>
            <select value={form.post} onChange={set("post")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors">
              <option value="">Select a post...</option>
              {posts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Shift Start</label>
              <input type="time" value={form.shiftStart} onChange={set("shiftStart")}
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Shift End</label>
              <input type="time" value={form.shiftEnd} onChange={set("shiftEnd")}
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 rounded-lg transition-colors">
              <Check size={13} /> {saving ? "Saving..." : "Add Guard"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 text-xs transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Guard Modal ──────────────────────────────────────────────────────────
function EditGuardModal({ guard, posts, onSave, onClose }) {
  const [form, setForm] = useState({
    name: guard.name ?? "", post: guard.post ?? "",
    shiftStart: guard.shiftStart ?? "", shiftEnd: guard.shiftEnd ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(guard.id, form); onClose(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Edit Guard</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{guard.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Full Name</label>
            <input type="text" value={form.name} onChange={set("name")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Post</label>
            <select value={form.post} onChange={set("post")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors">
              <option value="">Select a post...</option>
              {posts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Default Shift Start</label>
              <input type="time" value={form.shiftStart} onChange={set("shiftStart")}
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Default Shift End</label>
              <input type="time" value={form.shiftEnd} onChange={set("shiftEnd")}
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 rounded-lg transition-colors">
              <Check size={13} /> {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 text-xs transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Manage Posts Modal ────────────────────────────────────────────────────────
function ManagePostsModal({ posts, onAdd, onDelete, onClose }) {
  const [newPost, setNewPost] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) { setError("Post name is required."); return; }
    setSaving(true);
    try { await onAdd(newPost.trim()); setNewPost(""); setError(""); }
    catch { setError("Failed to add post."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Manage Posts</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6">
          <form onSubmit={handleAdd} className="flex gap-2 mb-5">
            <input type="text" value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="New post name..."
              className="flex-1 border border-gray-200 bg-gray-50 text-sm px-3 py-2 rounded-lg outline-none focus:border-black transition-colors" />
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 rounded-lg transition-colors">
              <Plus size={13} /> Add
            </button>
          </form>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {posts.length === 0 ? (
              <p className="text-xs text-gray-300 uppercase tracking-widest text-center py-4">No posts yet</p>
            ) : (
              posts.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                  </div>
                  <button onClick={() => onDelete(p.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shift Schedule Tab ────────────────────────────────────────────────────────
function ShiftScheduleTab({ guards, posts, shifts, onAddShift, onDeleteShift }) {
  const [view, setView]             = useState("monthly");
  const [cursor, setCursor]         = useState(new Date());
  const [dayModal, setDayModal]     = useState(null);
  const [addPrefill, setAddPrefill] = useState(null);
  const [showAddShift, setShowAddShift] = useState(false);

  const today = todayKey();

  const openAddShift = (datetimePrefix) => {
    setAddPrefill(datetimePrefix ?? null);
    setShowAddShift(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {["monthly", "weekly", "daily"].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${
                view === v ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
              }`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => openAddShift(null)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-lg">
          <Plus size={13} /> Add Shift
        </button>
      </div>

      {view === "monthly" && (
        <MonthlyView
          cursor={cursor} setCursor={setCursor}
          today={today} shifts={shifts} guards={guards}
          setDayModal={setDayModal}
        />
      )}
      {view === "weekly" && (
        <WeeklyView
          cursor={cursor} setCursor={setCursor}
          today={today} shifts={shifts} guards={guards}
          onDeleteShift={onDeleteShift}
          setDayModal={setDayModal}
        />
      )}
      {view === "daily" && (
        <DailyView
          cursor={cursor} setCursor={setCursor}
          today={today} shifts={shifts} guards={guards}
          onDeleteShift={onDeleteShift}
          openAddShift={openAddShift}
        />
      )}

      {dayModal && (
        <DayDetailModal
          dayKey={dayModal}
          shiftsOnDay={shifts.filter((s) => shiftTouchesDay(s, dayModal))}
          guards={guards}
          onDelete={onDeleteShift}
          onAddShift={(key) => openAddShift(`${key}T00:00`)}
          onClose={() => setDayModal(null)}
        />
      )}

      {showAddShift && (
        <AddShiftModal
          guards={guards}
          posts={posts}
          prefillStart={addPrefill}
          shifts={shifts}
          onSave={onAddShift}
          onClose={() => { setShowAddShift(false); setAddPrefill(null); }}
        />
      )}
    </div>
  );
}

// ── Guards Table Tab ──────────────────────────────────────────────────────────
function GuardsTableTab({ guards, shifts, loading, onEdit, onToggle, togglingId, search, setSearch, statusFilter, setStatusFilter }) {
  const today = todayKey();

  const getTodayShift = (guardId) =>
    shifts.find((s) => s.guardId === guardId && shiftTouchesDay(s, today));

  const filtered = guards.filter((g) => {
    const matchSearch =
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.email?.toLowerCase().includes(search.toLowerCase()) ||
      g.post?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Search size={14} className="text-gray-300 flex-shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or post..."
            className="bg-transparent text-sm w-full focus:outline-none text-gray-700 placeholder-gray-300" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 bg-white text-sm px-3 py-3 rounded-xl outline-none focus:border-black transition-colors text-gray-600">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1.6fr_0.8fr_0.8fr_auto] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {["Guard", "Post", "Today's Shift", "Duty Status", "Status", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">
              {guards.length === 0 ? "No guards added yet" : "No guards found"}
            </p>
          </div>
        ) : (
          filtered.map((g) => {
            const todayShift  = getTodayShift(g.id);
            const isOvernight = todayShift && dateKeyOf(todayShift.shiftStart) !== dateKeyOf(todayShift.shiftEnd);
            return (
              <div key={g.id}
                className="grid grid-cols-[1.5fr_1fr_1.6fr_0.8fr_0.8fr_auto] gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{g.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{g.email}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{g.post || "—"}</span>
                </div>
                <div>
                  {todayShift ? (
                    <>
                      <p className="text-xs font-mono text-gray-700">
                        {fmtShiftRange(todayShift.shiftStart, todayShift.shiftEnd)}
                      </p>
                      {isOvernight && (
                        <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest mt-0.5 inline-block">
                          Overnight
                        </span>
                      )}
                      {todayShift.post && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{todayShift.post}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-300 font-mono">No shift today</span>
                  )}
                </div>
                <DutyBadge guard={g} />
                <StatusPill status={g.status} />
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(g)} title="Edit"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onToggle(g)} disabled={togglingId === g.id}
                    title={g.status === "active" ? "Deactivate" : "Activate"}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40">
                    {g.status === "active"
                      ? <ToggleRight size={15} className="text-green-600" />
                      : <ToggleLeft size={15} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GuardManagement() {
  const [guards, setGuards]       = useState([]);
  const [posts, setPosts]         = useState([]);
  const [shifts, setShifts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("guards");
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddGuard, setShowAddGuard] = useState(false);
  const [showPosts, setShowPosts]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [togglingId, setTogglingId]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [g, p, s] = await Promise.all([getAllGuards(), getAllPosts(), getAllShifts()]);
        setGuards(g);
        setPosts(p);
        setShifts(s);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleAddGuard = async (form) => {
    const id = await addGuard(form);
    setGuards((prev) => [{
      id, name: form.name, email: form.email.toLowerCase().trim(),
      post: form.post, shiftStart: form.shiftStart, shiftEnd: form.shiftEnd, status: "active",
    }, ...prev]);
  };

  const handleEditGuard = async (docId, updates) => {
    await updateGuard(docId, updates);
    setGuards((prev) => prev.map((g) => g.id === docId ? { ...g, ...updates } : g));
  };

  const handleToggleStatus = async (guard) => {
    setTogglingId(guard.id);
    const newStatus = guard.status === "active" ? "inactive" : "active";
    try {
      await setGuardStatus(guard.id, newStatus);
      setGuards((prev) => prev.map((g) => g.id === guard.id ? { ...g, status: newStatus } : g));
    } catch (err) { console.error(err); }
    finally { setTogglingId(null); }
  };

  const handleAddPost    = async (name)   => { const id = await addPost(name); setPosts((prev) => [...prev, { id, name }]); };
  const handleDeletePost = async (postId) => { await deletePost(postId); setPosts((prev) => prev.filter((p) => p.id !== postId)); };

  const handleAddShift = async (form) => {
    const id = await addShift({
      guardId: form.guardId, shiftStart: form.shiftStart,
      shiftEnd: form.shiftEnd, post: form.post,
    });
    setShifts((prev) => [...prev, { id, guardId: form.guardId, shiftStart: form.shiftStart, shiftEnd: form.shiftEnd, post: form.post }]);
  };

  const handleDeleteShift = async (shiftId) => {
    await deleteShift(shiftId);
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
  };

  const onDutyCount = guards.filter(
    (g) => g.status === "active" && isGuardOnShift(g.shiftStart, g.shiftEnd)
  ).length;

  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Guards</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {guards.length} total · {guards.filter((g) => g.status === "active").length} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPosts(true)}
            className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-50 rounded-lg transition-colors">
            <MapPin size={13} /> Manage Posts
          </button>
          <button onClick={() => setShowAddGuard(true)}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-lg">
            <Plus size={14} /> Add Guard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <KPICard label="Total Guards" value={guards.length}
          sub={`${guards.filter((g) => g.status === "active").length} active · ${guards.filter((g) => g.status === "inactive").length} inactive`}
        />
        <KPICard label="On Duty Now" value={onDutyCount} sub="Currently on shift"
          accent={onDutyCount > 0 ? "text-green-700" : "text-gray-400"}
        />
        <KPICard label="Active Posts" value={posts.length} sub="Configured locations" />
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-8">
        {[
          { id: "guards",   label: "Guard List"      },
          { id: "schedule", label: "Shift Schedule", icon: Calendar },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${
              activeTab === id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
            }`}>
            {Icon && <Icon size={13} />}
            {label}
          </button>
        ))}
      </div>

      {activeTab === "guards" && (
        <GuardsTableTab
          guards={guards} shifts={shifts} loading={loading}
          onEdit={setEditTarget} onToggle={handleToggleStatus} togglingId={togglingId}
          search={search} setSearch={setSearch}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        />
      )}
      {activeTab === "schedule" && (
        <ShiftScheduleTab
          guards={guards} posts={posts} shifts={shifts}
          onAddShift={handleAddShift} onDeleteShift={handleDeleteShift}
        />
      )}

      {showAddGuard && <AddGuardModal posts={posts} onSave={handleAddGuard} onClose={() => setShowAddGuard(false)} />}
      {editTarget   && <EditGuardModal guard={editTarget} posts={posts} onSave={handleEditGuard} onClose={() => setEditTarget(null)} />}
      {showPosts    && <ManagePostsModal posts={posts} onAdd={handleAddPost} onDelete={handleDeletePost} onClose={() => setShowPosts(false)} />}
    </div>
  );
}