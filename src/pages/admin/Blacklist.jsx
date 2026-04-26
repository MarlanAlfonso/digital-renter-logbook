// src/pages/admin/Blacklist.jsx
import { useState, useEffect } from "react";
import { getAllBlacklisted, addToBlacklist, removeFromBlacklist } from "../../firebase/blacklist";
import { getAllResidents } from "../../firebase/residents";
import { useAuth } from "../../hooks/useAuth";
import { Search, Plus, Trash2, X, Check, ShieldAlert, ShieldOff } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
}

// ── Type Badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
      type === "resident"
        ? "bg-gray-900 text-white border-gray-900"
        : "bg-gray-100 text-gray-600 border-gray-200"
    }`}>
      {type}
    </span>
  );
}

// ── Add to Blacklist Modal ────────────────────────────────────────────────────
function AddBlacklistModal({ residents, onSave, onClose }) {
  const [form, setForm] = useState({
    subjectType: "resident",
    subjectId:   "",
    subjectName: "",
    reason:      "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // When a resident is selected from dropdown, auto-fill name + ID
  const handleResidentSelect = (e) => {
    const selected = residents.find((r) => r.residentId === e.target.value);
    if (selected) {
      setForm((f) => ({
        ...f,
        subjectId:   selected.residentId,
        subjectName: selected.name,
      }));
    } else {
      setForm((f) => ({ ...f, subjectId: "", subjectName: "" }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.subjectId.trim())   { setError("Identifier is required."); return; }
    if (!form.subjectName.trim()) { setError("Name is required."); return; }
    if (!form.reason.trim())      { setError("Reason is required."); return; }

    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message ?? "Failed to add to blacklist.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Add to Blacklist</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Type</label>
            <div className="flex gap-2">
              {["resident", "visitor"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, subjectType: t, subjectId: "", subjectName: "" }))}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 rounded-lg transition-colors ${
                    form.subjectType === t
                      ? "bg-black text-white border-black"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Resident picker OR manual entry */}
          {form.subjectType === "resident" ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Select Resident
              </label>
              <select
                onChange={handleResidentSelect}
                defaultValue=""
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors"
              >
                <option value="">Choose a resident...</option>
                {residents
                  .filter((r) => r.status === "active")
                  .map((r) => (
                    <option key={r.id} value={r.residentId}>
                      {r.name} — {r.residentId} (Unit {r.unit})
                    </option>
                  ))}
              </select>
              {form.subjectId && (
                <p className="text-[10px] text-gray-400 mt-1 font-mono">ID: {form.subjectId}</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Visitor Name
                </label>
                <input
                  type="text"
                  value={form.subjectName}
                  onChange={set("subjectName")}
                  placeholder="Full name of visitor"
                  className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Visitor ID
                </label>
                <input
                  type="text"
                  value={form.subjectId}
                  onChange={set("subjectId")}
                  placeholder="e.g. VIS-20260413-0001"
                  className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors font-mono"
                />
              </div>
            </>
          )}

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Reason
            </label>
            <textarea
              value={form.reason}
              onChange={set("reason")}
              placeholder="State the reason for blacklisting..."
              rows={3}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-red-700 disabled:bg-gray-400 transition-colors rounded-lg"
            >
              <Check size={13} /> {saving ? "Adding..." : "Add to Blacklist"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Remove Confirm Modal ──────────────────────────────────────────────────────
function RemoveConfirmModal({ entry, onConfirm, onClose }) {
  const [removing, setRemoving] = useState(false);

  const handleConfirm = async () => {
    setRemoving(true);
    try { await onConfirm(entry.id); onClose(); }
    catch { /* silent */ }
    finally { setRemoving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldOff size={20} className="text-gray-400" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Remove from Blacklist</p>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Remove <span className="font-bold text-gray-900">{entry.subjectName}</span> from the blacklist?
        </p>
        <p className="text-xs text-gray-400 mb-6">
          They will regain normal access after removal.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={removing}
            className="flex-1 bg-black text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 transition-colors rounded-lg"
          >
            {removing ? "Removing..." : "Confirm Remove"}
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Blacklist() {
  const { userData } = useAuth();

  const [entries, setEntries]       = useState([]);
  const [residents, setResidents]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd]       = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [bl, res] = await Promise.all([getAllBlacklisted(), getAllResidents()]);
        setEntries(bl);
        setResidents(res);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleAdd = async (form) => {
    const id = await addToBlacklist({
      subjectType:  form.subjectType,
      subjectId:    form.subjectId.trim(),
      subjectName:  form.subjectName.trim(),
      reason:       form.reason.trim(),
      addedByEmail: userData?.email ?? "",
      addedByName:  userData?.name  ?? "",
    });
    setEntries((prev) => [{
      id,
      subjectType:  form.subjectType,
      subjectId:    form.subjectId.trim(),
      subjectName:  form.subjectName.trim(),
      reason:       form.reason.trim(),
      addedByName:  userData?.name ?? "",
      addedAt:      null,
    }, ...prev]);
  };

  const handleRemove = async (docId) => {
    await removeFromBlacklist(docId);
    setEntries((prev) => prev.filter((e) => e.id !== docId));
  };

  const filtered = entries.filter((e) => {
    const matchSearch =
      e.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
      e.subjectId?.toLowerCase().includes(search.toLowerCase()) ||
      e.reason?.toLowerCase().includes(search.toLowerCase()) ||
      e.addedByName?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.subjectType === typeFilter;
    return matchSearch && matchType;
  });

  const residentCount = entries.filter((e) => e.subjectType === "resident").length;
  const visitorCount  = entries.filter((e) => e.subjectType === "visitor").length;

  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Blacklist</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {entries.length} total · {residentCount} residents · {visitorCount} visitors
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-red-700 transition-colors rounded-lg"
        >
          <Plus size={14} /> Add to Blacklist
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Blacklisted", value: entries.length, sub: "All types" },
          { label: "Blacklisted Residents", value: residentCount, sub: "Resident accounts" },
          { label: "Blacklisted Visitors", value: visitorCount, sub: "Visitor records" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">{label}</p>
            <span className={`text-5xl font-black ${value > 0 ? "text-red-600" : "text-gray-400"}`}>
              {value}
            </span>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Search size={14} className="text-gray-300 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or reason..."
            className="bg-transparent text-sm w-full focus:outline-none text-gray-700 placeholder-gray-300"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 bg-white text-sm px-3 py-3 rounded-xl outline-none focus:border-black transition-colors text-gray-600"
        >
          <option value="all">All Types</option>
          <option value="resident">Residents</option>
          <option value="visitor">Visitors</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.5fr_1fr_0.7fr_2fr_1fr_auto] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {["Identifier", "ID", "Type", "Reason", "Date Added", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldOff size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">
              {entries.length === 0 ? "No blacklisted entries" : "No results found"}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[1.5fr_1fr_0.7fr_2fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-50 items-start hover:bg-gray-50/60 transition-colors"
            >
              {/* Name */}
              <div>
                <p className="text-sm font-bold text-gray-900">{entry.subjectName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Added by {entry.addedByName ?? "—"}</p>
              </div>

              {/* ID */}
              <span className="text-xs font-mono text-gray-600 pt-0.5">{entry.subjectId}</span>

              {/* Type */}
              <TypeBadge type={entry.subjectType} />

              {/* Reason */}
              <p className="text-sm text-gray-600 leading-relaxed">{entry.reason}</p>

              {/* Date Added */}
              <span className="text-xs text-gray-500 pt-0.5">{formatDate(entry.addedAt)}</span>

              {/* Actions */}
              <button
                onClick={() => setRemoveTarget(entry)}
                title="Remove from blacklist"
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <AddBlacklistModal
          residents={residents}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {removeTarget && (
        <RemoveConfirmModal
          entry={removeTarget}
          onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}