// src/pages/admin/ResidentManagement.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllResidents, setResidentStatus, regenerateResidentQR, updateResident } from "../../firebase/residents";
import { getAllBlacklisted } from "../../firebase/blacklist";
import QRModal from "../../components/admin/QRModal";
import { Search, Plus, QrCode, ToggleLeft, ToggleRight, Pencil, X, Check, Eye, EyeOff } from "lucide-react";

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">{label}</p>
      <span className="text-5xl font-black text-gray-900">{value ?? "—"}</span>
      {sub && <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{sub}</p>}
    </div>
  );
}

// ── Status Pill ───────────────────────────────────────────────────────────────
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

// ── Inside Badge ──────────────────────────────────────────────────────────────
function InsideBadge({ isInside }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
      isInside
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-400 border-gray-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isInside ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
      {isInside ? "Inside" : "Outside"}
    </span>
  );
}

// ── PIN Cell — read-only with reveal toggle ───────────────────────────────────
function PinCell({ pin }) {
  const [revealed, setRevealed] = useState(false);
  if (!pin) return <span className="text-[10px] text-gray-300 font-mono">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono tracking-widest text-gray-700">
        {revealed ? pin : "••••••"}
      </span>
      <button
        onClick={() => setRevealed((v) => !v)}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        title={revealed ? "Hide PIN" : "Reveal PIN"}
      >
        {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ resident, onSave, onClose }) {
  const [form, setForm] = useState({
    name:             resident.name ?? "",
    unit:             resident.unit ?? "",
    moveInDate:       resident.moveInDate ?? "",
    emergencyContact: resident.emergencyContact ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(resident.id, form); onClose(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Edit Resident</p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{resident.residentId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Full Name",          key: "name",             type: "text" },
            { label: "Unit",               key: "unit",             type: "text" },
            { label: "Move-In Date",       key: "moveInDate",       type: "date" },
            { label: "Emergency Contact",  key: "emergencyContact", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 transition-colors rounded-lg"
            >
              <Check size={13} /> {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={onClose} className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 text-xs">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResidentManagement() {
  const navigate = useNavigate();

  const [residents, setResidents]           = useState([]);
  const [blacklistCount, setBlacklistCount] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [qrTarget, setQrTarget]             = useState(null);
  const [editTarget, setEditTarget]         = useState(null);
  const [togglingId, setTogglingId]         = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, bl] = await Promise.all([getAllResidents(), getAllBlacklisted()]);
        setResidents(data);
        setBlacklistCount(bl.filter((b) => b.subjectType === "resident").length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleStatus = async (resident) => {
    setTogglingId(resident.id);
    const newStatus = resident.status === "active" ? "inactive" : "active";
    try {
      await setResidentStatus(resident.id, newStatus);
      setResidents((prev) => prev.map((r) => r.id === resident.id ? { ...r, status: newStatus } : r));
    } catch (err) { console.error(err); }
    finally { setTogglingId(null); }
  };

  const handleRegenQR = async (resident) => {
    try {
      const newQrData = await regenerateResidentQR(resident.id, resident.residentId);
      setResidents((prev) => prev.map((r) => r.id === resident.id ? { ...r, qrCodeData: newQrData } : r));
      setQrTarget((prev) => prev ? { ...prev, qrCodeData: newQrData } : null);
    } catch (err) { console.error(err); }
  };

  const handleEdit = async (uid, updates) => {
    await updateResident(uid, updates);
    setResidents((prev) => prev.map((r) => r.id === uid ? { ...r, ...updates } : r));
  };

  const filtered = residents.filter((r) => {
    const matchSearch =
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.residentId?.toLowerCase().includes(search.toLowerCase()) ||
      r.unit?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Residents</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {residents.length} total · {residents.filter((r) => r.status === "active").length} active
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/residents/register")}
          className="flex items-center gap-2 bg-black text-white px-5 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-lg"
        >
          <Plus size={14} /> Register Resident
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <KPICard
          label="Total Registered Residents"
          value={residents.length}
          sub={`${residents.filter((r) => r.status === "active").length} active · ${residents.filter((r) => r.status === "inactive").length} inactive`}
        />
        <KPICard
          label="Currently Blacklisted Residents"
          value={blacklistCount}
          sub={blacklistCount > 0 ? "View in Blacklist module" : "No residents blacklisted"}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Search size={14} className="text-gray-300 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, unit or email..."
            className="bg-transparent text-sm w-full focus:outline-none text-gray-700 placeholder-gray-300"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 bg-white text-sm px-3 py-3 rounded-xl outline-none focus:border-black transition-colors text-gray-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header — added PIN column */}
        <div className="grid grid-cols-[1.5fr_0.6fr_1.2fr_0.6fr_0.6fr_0.6fr_auto] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {["Resident", "Unit", "Resident ID", "PIN", "Live Status", "Status", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="px-6 py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">No residents found</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1.5fr_0.6fr_1.2fr_0.6fr_0.6fr_0.6fr_auto] gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors"
            >
              {/* Name + Email */}
              <div>
                <p className="text-sm font-bold text-gray-900">{r.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{r.email}</p>
              </div>

              {/* Unit */}
              <span className="text-sm text-gray-600">{r.unit}</span>

              {/* Resident ID */}
              <span className="text-xs font-mono text-gray-700 tracking-wider">{r.residentId}</span>

              {/* PIN — read-only with reveal toggle */}
              <PinCell pin={r.pin} />

              {/* Live Status */}
              <InsideBadge isInside={r.isInside} />

              {/* Account Status */}
              <StatusPill status={r.status} />

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditTarget(r)}
                  title="Edit"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Pencil size={14} />
                </button>

                <button
                  onClick={() => setQrTarget(r)}
                  title="View QR"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <QrCode size={14} />
                </button>

                <button
                  onClick={() => handleToggleStatus(r)}
                  disabled={togglingId === r.id}
                  title={r.status === "active" ? "Deactivate" : "Activate"}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40"
                >
                  {r.status === "active"
                    ? <ToggleRight size={15} className="text-green-600" />
                    : <ToggleLeft size={15} />
                  }
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Modal */}
      {qrTarget && (
        <QRModal
          residentId={qrTarget.residentId}
          qrCodeData={qrTarget.qrCodeData}
          name={qrTarget.name}
          unit={qrTarget.unit}
          onRegenerate={() => handleRegenQR(qrTarget)}
          onClose={() => setQrTarget(null)}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          resident={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}