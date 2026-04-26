// src/pages/resident/ResidentDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import { useAuth } from "../../hooks/useAuth";
import { getLogsByResidentId } from "../../firebase/entryLogs";
import { getVisitorRequestsByResident, submitVisitorRequest } from "../../firebase/visitorService";
import { changeResidentPin } from "../../firebase/residents";
import VisitorPasses from "./VisitorPasses";
import MyLogs from "./MyLogs";
import {
  LayoutDashboard, Users, History, LogOut,
  Menu, X, Download, Plus, Lock,
} from "lucide-react";

// ── Change PIN Modal ──────────────────────────────────────────────────────────
function ChangePinModal({ userEmail, onClose, onSuccess }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin]         = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(newPin))    { setError("New PIN must be exactly 6 digits."); return; }
    if (newPin !== confirmPin)       { setError("PINs do not match."); return; }
    if (newPin === currentPin)       { setError("New PIN must be different from current PIN."); return; }
    setSaving(true);
    try {
      await changeResidentPin(userEmail, currentPin, newPin);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message ?? "Failed to change PIN.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-gray-900">Change PIN</p>
            <p className="text-[10px] text-gray-400 mt-0.5">6-digit numeric PIN</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl font-bold uppercase tracking-wider">
              {error}
            </p>
          )}
          {[
            { label: "Current PIN",     value: currentPin, set: setCurrentPin },
            { label: "New PIN",         value: newPin,     set: setNewPin     },
            { label: "Confirm New PIN", value: confirmPin, set: setConfirmPin },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={value}
                onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full border border-gray-200 bg-gray-50 text-center text-xl font-black tracking-[0.4em] px-4 py-3 rounded-xl outline-none focus:border-gray-900 transition-colors"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black disabled:bg-gray-400 transition-colors mt-2"
          >
            {saving ? "Saving..." : "Update PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Time Picker ───────────────────────────────────────────────────────────────
// Clean custom picker — avoids browser native scroll-wheel UI
function TimePicker({ value, onChange }) {
  // Parse current value
  const [rawH, rawM, rawAmpm] = (() => {
    if (!value) return [12, 0, "AM"];
    const [hh, mm] = value.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12  = hh % 12 || 12;
    return [h12, mm, ampm];
  })();

  const [hour, setHour]   = useState(rawH);
  const [min, setMin]     = useState(rawM);
  const [ampm, setAmpm]   = useState(rawAmpm);

  // Emit 24h value to parent on any change
  const emit = (h, m, ap) => {
    let h24 = h % 12;
    if (ap === "PM") h24 += 12;
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const setH = (v) => { setHour(v); emit(v, min, ampm); };
  const setM = (v) => { setMin(v);  emit(hour, v, ampm); };
  const setA = (v) => { setAmpm(v); emit(hour, min, v); };

  const displayValue = value
    ? (() => {
        const [hh, mm] = value.split(":").map(Number);
        const ap = hh >= 12 ? "PM" : "AM";
        const h  = hh % 12 || 12;
        return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
      })()
    : "Select time";

  return (
    <div className="w-full border border-gray-200 bg-gray-50 rounded-xl overflow-hidden focus-within:border-gray-900 transition-colors">
      {/* Display row */}
      <div className="px-4 py-3 text-sm font-semibold text-gray-700">{displayValue}</div>

      {/* Picker row */}
      <div className="flex border-t border-gray-100 divide-x divide-gray-100">
        {/* Hour */}
        <select
          value={hour}
          onChange={(e) => setH(Number(e.target.value))}
          className="flex-1 bg-white text-center text-sm py-2.5 outline-none appearance-none cursor-pointer text-gray-700 font-semibold"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
          ))}
        </select>

        {/* Minute */}
        <select
          value={min}
          onChange={(e) => setM(Number(e.target.value))}
          className="flex-1 bg-white text-center text-sm py-2.5 outline-none appearance-none cursor-pointer text-gray-700 font-semibold"
        >
          {[0, 15, 30, 45].map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>

        {/* AM/PM */}
        <div className="flex flex-col divide-y divide-gray-100">
          {["AM", "PM"].map((ap) => (
            <button
              key={ap}
              type="button"
              onClick={() => setA(ap)}
              className={`px-5 py-1.5 text-xs font-black uppercase tracking-widest transition-colors ${
                ampm === ap
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-400 hover:text-gray-700"
              }`}
            >
              {ap}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Visitor Request Modal ─────────────────────────────────────────────────────
function VisitorRequestModal({ onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    visitorName: "", purpose: "", expectedDate: "", expectedTime: "",
  });
  const set    = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // Date constraints: min = 3 days from now, no far upper limit
  const minDate = addDays(3);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-gray-900">Request Visitor Pass</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Schedule at least 3 days in advance</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
          className="p-6 space-y-4"
        >
          {/* Visitor Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Visitor Name</label>
            <input
              type="text"
              required
              value={form.visitorName}
              onChange={set("visitorName")}
              placeholder="Full name of your guest"
              className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 rounded-xl outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Purpose of Visit</label>
            <input
              type="text"
              required
              value={form.purpose}
              onChange={set("purpose")}
              placeholder="e.g. Family visit, Business"
              className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 rounded-xl outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>

          {/* Expected Date — min 3 days from today */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Expected Date
              <span className="ml-2 text-gray-300 normal-case tracking-normal font-normal">· earliest: {minDate}</span>
            </label>
            <input
              type="date"
              required
              min={minDate}
              value={form.expectedDate}
              onChange={set("expectedDate")}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 rounded-xl outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>

          {/* Expected Time — custom picker */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Expected Time</label>
            <TimePicker
              value={form.expectedTime}
              onChange={setVal("expectedTime")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black disabled:bg-gray-400 transition-colors mt-2"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({ id, icon: Icon, label, active, onClick, badge }) { // eslint-disable-line
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-4 px-5 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
        active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon size={18} />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          active ? "bg-white/20 text-white" : "bg-gray-900 text-white"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResidentDashboard() {
  const { userData, logout } = useAuth();

  const [tab, setTab]                     = useState("dashboard");
  const [menuOpen, setMenuOpen]           = useState(false);
  const [logs, setLogs]                   = useState([]);
  const [visitors, setVisitors]           = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [showPinModal, setShowPinModal]   = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast]                 = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    if (userData?.residentId) {
      getLogsByResidentId(userData.residentId).then(setLogs).catch(console.error);
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.email) {
      getVisitorRequestsByResident(userData.email).then(setVisitors).catch(console.error);
    }
  }, [userData]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    htmlToImage.toPng(qrRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 })
      .then((url) => {
        const a = document.createElement("a");
        a.download = `QR_${userData?.residentId}.png`;
        a.href = url;
        a.click();
      })
      .catch(() => showToast("Download failed.", "error"));
  };

  const handleSubmitVisitor = async (form) => {
    setSubmitLoading(true);
    try {
      await submitVisitorRequest({
        ...form,
        residentEmail: userData.email,
        residentId:    userData.residentId,
        residentUnit:  userData.unit,
        residentName:  userData.name,
      });
      setShowModal(false);
      showToast("Visitor request submitted!");
      const updated = await getVisitorRequestsByResident(userData.email);
      setVisitors(updated);
    } catch (err) {
      console.error(err);
      showToast("Failed to submit request.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const pendingCount = visitors.filter((v) => v.status === "pending").length;

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard"       },
    { id: "visitors",  icon: Users,           label: "Visitor Passes", badge: pendingCount },
    { id: "logs",      icon: History,         label: "My Logs"         },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-mono">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg border ${
          toast.type === "error"
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-white text-gray-900 border-gray-200"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Resident Portal</p>
          <p className="text-sm font-black uppercase tracking-tight text-gray-900 leading-tight">
            {userData?.name ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
            userData?.isInside
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${userData?.isInside ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            {userData?.isInside ? "Inside" : "Outside"}
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Collapsible Nav Menu ── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-[65px] left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg">
            <nav>
              {navItems.map((item) => (
                <NavItem
                  key={item.id}
                  {...item}
                  active={tab === item.id}
                  onClick={(id) => { setTab(id); setMenuOpen(false); }}
                />
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={logout}
                className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Bottom Tab Bar (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex sm:hidden">
        {navItems.map(({ id, icon: Icon, label, badge }) => ( // eslint-disable-line
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-widest transition-colors relative ${
              tab === id ? "text-gray-900" : "text-gray-400"
            }`}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.5} />
            {label.split(" ")[0]}
            {badge > 0 && (
              <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 bg-gray-900 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="pb-24 sm:pb-8 px-5 pt-6 max-w-lg mx-auto">

        {/* ════ DASHBOARD TAB ════ */}
        {tab === "dashboard" && (
          <div className="space-y-5">

            {/* Identity Card */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gray-900 px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-gray-400">Digital Renter Logbook</p>
                  <p className="text-xs font-black uppercase tracking-wider text-white mt-0.5">Identity Card</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                  userData?.isInside ? "bg-green-500/20 text-green-300" : "bg-white/10 text-gray-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${userData?.isInside ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                  {userData?.isInside ? "Inside" : "Outside"}
                </div>
              </div>

              <div className="p-6 flex flex-col items-center">
                {/* Downloadable area */}
                <div
                  ref={qrRef}
                  className="bg-white flex flex-col items-center px-8 pt-8 pb-6 mb-5"
                  style={{ fontFamily: "monospace" }}
                >
                  <QRCodeCanvas
                    value={userData?.qrCodeData || userData?.residentId || ""}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                  <div className="text-center mt-5">
                    <p style={{ fontSize:"9px", letterSpacing:"0.25em", textTransform:"uppercase", color:"#9ca3af", marginBottom:"6px", fontFamily:"monospace" }}>
                      Resident ID
                    </p>
                    <p style={{ fontSize:"22px", fontWeight:"900", letterSpacing:"-0.02em", color:"#111827", fontFamily:"monospace" }}>
                      {userData?.residentId ?? "—"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 w-full justify-center border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                >
                  <Download size={14} /> Download QR as PNG
                </button>
                <button
                  onClick={() => setShowPinModal(true)}
                  className="flex items-center gap-2 w-full justify-center border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                >
                  <Lock size={14} /> Change PIN
                </button>
              </div>
            </div>

            {/* Request Visitor Pass CTA */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-3 shadow-sm"
            >
              <Plus size={18} /> Request Visitor Pass
            </button>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-gray-900">{logs.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Total Entries</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-gray-900">{visitors.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Visitor Passes</p>
              </div>
            </div>
          </div>
        )}

        {/* ════ VISITOR PASSES TAB ════ */}
        {tab === "visitors" && (
          <VisitorPasses
            visitors={visitors}
            onRequest={() => setShowModal(true)}
          />
        )}

        {/* ════ MY LOGS TAB ════ */}
        {tab === "logs" && (
          <MyLogs logs={logs} />
        )}
      </main>

      {/* ── Visitor Request Modal ── */}
      {showModal && (
        <VisitorRequestModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitVisitor}
          loading={submitLoading}
        />
      )}

      {showPinModal && (
        <ChangePinModal
          userEmail={userData?.email}
          onClose={() => setShowPinModal(false)}
          onSuccess={() => showToast("PIN updated successfully!")}
        />
      )}
    </div>
  );
}