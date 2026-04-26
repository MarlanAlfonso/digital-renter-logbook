// src/pages/admin/VisitorRequests.jsx
import { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import { useRef } from "react";
import {
  getAllVisitorRequests,
  approveVisitorRequest,
  rejectVisitorRequest,
} from "../../firebase/visitorService";
import { Search, Check, X, Download, ChevronDown } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(date, time) {
  if (!date) return "—";
  try {
    const d = new Date(`${date}T${time || "00:00"}`);
    return d.toLocaleDateString("en-PH", {
      month: "short", day: "2-digit", year: "numeric",
    }) + (time ? ` · ${time}` : "");
  } catch { return `${date}${time ? ` · ${time}` : ""}`; }
}

function formatCreatedAt(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {label}
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
        active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
      }`}>
        {count}
      </span>
    </button>
  );
}

// ── Decline Modal ─────────────────────────────────────────────────────────────
function DeclineModal({ request, onConfirm, onClose }) {
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try { await onConfirm(request.id, reason); onClose(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Decline Request</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Visitor</p>
            <p className="text-sm font-bold text-gray-900">{request.visitorName}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              Requested by {request.residentName ?? request.residentEmail} · Unit {request.residentUnit}
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for declining..."
              rows={3}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-colors rounded-lg"
            >
              <X size={13} /> {saving ? "Declining..." : "Decline Request"}
            </button>
            <button onClick={onClose}
              className="px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 text-xs">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QR View Modal (shown after approval) ─────────────────────────────────────
function QRViewModal({ request, onClose }) {
  const qrRef = useRef(null);

  const download = () => {
    if (!qrRef.current) return;
    htmlToImage.toPng(qrRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 })
      .then((url) => {
        const a = document.createElement("a");
        a.download = `VisitorQR_${request.visitorId}.png`;
        a.href = url;
        a.click();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Visitor QR Generated</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{request.visitorName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="flex justify-center py-8 px-6">
          <div ref={qrRef} className="bg-white p-4 border border-gray-100 rounded-xl">
            <QRCodeCanvas value={request.qrCodeData || request.visitorId} size={200} level="H" />
          </div>
        </div>
        <div className="text-center pb-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Visitor ID</p>
          <p className="text-sm font-mono font-bold tracking-wider text-gray-900">{request.visitorId}</p>
        </div>
        <div className="px-6 pb-6 pt-4">
          <button onClick={download}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-lg">
            <Download size={13} /> Download QR
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Request Row ───────────────────────────────────────────────────────────────
function RequestRow({ request, tab, onApprove, onDecline, onViewQR, approving }) {
  return (
    <div className="grid grid-cols-[1.2fr_1.2fr_0.6fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors">
      {/* Visitor */}
      <div>
        <p className="text-sm font-bold text-gray-900">{request.visitorName}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{request.purpose}</p>
      </div>

      {/* Resident */}
      <div>
        <p className="text-sm font-semibold text-gray-700">
          {request.residentName ?? request.residentEmail}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{request.residentEmail}</p>
      </div>

      {/* Unit */}
      <span className="text-sm text-gray-600">{request.residentUnit ?? "—"}</span>

      {/* Scheduled */}
      <span className="text-xs text-gray-600">
        {formatDateTime(request.expectedDate, request.expectedTime)}
      </span>

      {/* Submitted */}
      <span className="text-xs text-gray-400">{formatCreatedAt(request.createdAt)}</span>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {tab === "pending" && (
          <>
            <button
              onClick={() => onApprove(request)}
              disabled={approving === request.id}
              title="Approve"
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-colors rounded-lg"
            >
              <Check size={12} />
              {approving === request.id ? "..." : "Approve"}
            </button>
            <button
              onClick={() => onDecline(request)}
              title="Decline"
              className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors rounded-lg"
            >
              <X size={12} /> Decline
            </button>
          </>
        )}

        {tab === "approved" && (
          <button
            onClick={() => onViewQR(request)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors rounded-lg"
          >
            View QR
          </button>
        )}

        {tab === "rejected" && request.rejectionReason && (
          <span className="text-[10px] text-red-500 max-w-[160px] truncate" title={request.rejectionReason}>
            {request.rejectionReason}
          </span>
        )}

        {tab === "rejected" && !request.rejectionReason && (
          <span className="text-[10px] text-gray-300 uppercase tracking-widest">No reason given</span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VisitorRequests() {
  const [all, setAll]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch]       = useState("");
  const [approving, setApproving] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [qrTarget, setQrTarget]           = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllVisitorRequests();
      setAll(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (request) => {
    setApproving(request.id);
    try {
      const { visitorId, qrCodeData } = await approveVisitorRequest(request.id);
      const updated = { ...request, status: "approved", visitorId, qrCodeData };
      setAll((prev) => prev.map((r) => r.id === request.id ? updated : r));
      setQrTarget(updated);
    } catch (err) { console.error(err); }
    finally { setApproving(null); }
  };

  const handleDecline = async (requestId, reason) => {
    await rejectVisitorRequest(requestId, reason);
    setAll((prev) => prev.map((r) =>
      r.id === requestId ? { ...r, status: "rejected", rejectionReason: reason || null } : r
    ));
  };

  // Split by status
  const pending  = all.filter((r) => r.status === "pending");
  const approved = all.filter((r) => r.status === "approved");
  const rejected = all.filter((r) => r.status === "rejected");

  const tabData  = { pending, approved, rejected };
  const current  = tabData[activeTab] ?? [];

  // Search
  const filtered = current.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.visitorName?.toLowerCase().includes(q) ||
      r.residentName?.toLowerCase().includes(q) ||
      r.residentEmail?.toLowerCase().includes(q) ||
      r.residentUnit?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">
            Visitor Requests
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {all.length} total · {pending.length} pending
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Pending",  value: pending.length,  accent: pending.length > 0 ? "text-yellow-600" : "text-gray-400" },
          { label: "Approved", value: approved.length, accent: "text-green-700" },
          { label: "Declined", value: rejected.length, accent: rejected.length > 0 ? "text-red-600" : "text-gray-400" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">{label}</p>
            <span className={`text-5xl font-black ${accent}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1.5">
          <TabBtn label="Pending"  count={pending.length}  active={activeTab === "pending"}  onClick={() => setActiveTab("pending")} />
          <TabBtn label="Approved" count={approved.length} active={activeTab === "approved"} onClick={() => setActiveTab("approved")} />
          <TabBtn label="Declined" count={rejected.length} active={activeTab === "rejected"} onClick={() => setActiveTab("rejected")} />
        </div>

        <div className="flex-1 max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Search size={14} className="text-gray-300 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor, resident, unit..."
            className="bg-transparent text-sm w-full focus:outline-none text-gray-700 placeholder-gray-300"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.2fr_1.2fr_0.6fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {["Visitor", "Resident", "Unit", "Scheduled", "Submitted", "Actions"].map((h) => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold">
              No {activeTab} requests
            </p>
          </div>
        ) : (
          filtered.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              tab={activeTab}
              onApprove={handleApprove}
              onDecline={setDeclineTarget}
              onViewQR={setQrTarget}
              approving={approving}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {declineTarget && (
        <DeclineModal
          request={declineTarget}
          onConfirm={handleDecline}
          onClose={() => setDeclineTarget(null)}
        />
      )}

      {qrTarget && (
        <QRViewModal
          request={qrTarget}
          onClose={() => setQrTarget(null)}
        />
      )}
    </div>
  );
}