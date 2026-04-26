// src/pages/resident/VisitorPasses.jsx
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { CheckCircle2, Clock, XCircle, Plus, ChevronDown, ChevronUp } from "lucide-react";

// ── Status Badge ──────────────────────────────────────────────────────────────
function VisitorStatusBadge({ status }) {
  const config = {
    pending:  { icon: Clock,        color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Pending"  },
    approved: { icon: CheckCircle2, color: "text-green-700 bg-green-50 border-green-200",    label: "Approved" },
    rejected: { icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200",          label: "Declined" },
  };
  const { icon: Icon, color, label } = config[status] ?? config.pending; // eslint-disable-line
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${color}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

// ── Visitor Card ──────────────────────────────────────────────────────────────
function VisitorCard({ v }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            v.status === "approved" ? "bg-green-500"
            : v.status === "rejected" ? "bg-red-500"
            : "bg-yellow-500 animate-pulse"
          }`} />
          <div className="text-left min-w-0">
            <p className="text-sm font-black uppercase tracking-tight text-gray-900 truncate">
              {v.visitorName}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{v.purpose}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <VisitorStatusBadge status={v.status} />
          {expanded
            ? <ChevronUp size={14} className="text-gray-400" />
            : <ChevronDown size={14} className="text-gray-400" />
          }
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">

          {/* Scheduled info */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Scheduled</p>
            <p className="text-xs font-semibold text-gray-700">
              {v.expectedDate} {v.expectedTime ? `· ${v.expectedTime}` : ""}
            </p>
          </div>

          {/* Approved — show QR */}
          {v.status === "approved" && v.qrCodeData && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="bg-white border border-gray-100 rounded-lg p-2 flex-shrink-0">
                <QRCodeCanvas value={v.qrCodeData} size={72} level="H" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Visitor Pass ID</p>
                <p className="text-xs font-black font-mono text-gray-900 leading-snug">{v.visitorId}</p>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  Show or forward this QR to your guest for entry.
                </p>
              </div>
            </div>
          )}

          {/* Pending note */}
          {v.status === "pending" && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
              <p className="text-[10px] text-yellow-700 font-bold uppercase tracking-widest">
                Awaiting admin approval
              </p>
              <p className="text-[10px] text-yellow-600 mt-1">
                You'll receive your visitor QR once approved.
              </p>
            </div>
          )}

          {/* Declined reason */}
          {v.status === "rejected" && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-1">
                Reason for Decline
              </p>
              <p className="text-xs text-red-700">
                {v.rejectionReason || "No reason provided."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab Filter ────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",      label: "All"      },
  { key: "pending",  label: "Pending"  },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
];

// ── Main Export ───────────────────────────────────────────────────────────────
export default function VisitorPasses({ visitors, onRequest }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? visitors
    : visitors.filter((v) => v.status === filter);

  const pendingCount  = visitors.filter((v) => v.status === "pending").length;
  const approvedCount = visitors.filter((v) => v.status === "approved").length;
  const declinedCount = visitors.filter((v) => v.status === "rejected").length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Visitor Passes</h2>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
            {visitors.length} total · {pendingCount} pending
          </p>
        </div>
        <button
          onClick={onRequest}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
        >
          <Plus size={12} /> Request
        </button>
      </div>

      {/* KPI mini row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Pending",  count: pendingCount,  color: "text-yellow-600" },
          { label: "Approved", count: approvedCount, color: "text-green-700"  },
          { label: "Declined", count: declinedCount, color: "text-red-600"    },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${count > 0 ? color : "text-gray-300"}`}>{count}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${
              filter === key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-300 font-bold">
            No {filter === "all" ? "" : filter} passes
          </p>
        </div>
      ) : (
        filtered.map((v) => <VisitorCard key={v.id} v={v} />)
      )}
    </div>
  );
}