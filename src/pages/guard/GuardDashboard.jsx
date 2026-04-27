// src/pages/guard/GuardDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../../hooks/useAuth";
import {
  getResidentByResidentId, setResidentInsideStatus,
  getAllResidents, verifyResidentPin,
} from "../../firebase/residents";
import { getVisitorRequestByVisitorId, closeVisitorPass, getAllVisitorRequests } from "../../firebase/visitorService";
import { checkBlacklist } from "../../firebase/blacklist";
import { createEntryLog } from "../../firebase/entryLogs";
import {
  ScanLine, ShieldAlert, ShieldCheck, LogOut,
  Menu, X, QrCode, ClipboardList, UserX,
  CheckCircle2, ChevronRight, AlertTriangle, Clock,
  Eye, EyeOff,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const ID_TYPES = [
  "Driver's License", "Passport", "SSS ID",
  "PhilHealth ID", "Postal ID", "School ID", "Other",
];

const SCAN_STATE = {
  IDLE:       "IDLE",
  SCANNING:   "SCANNING",
  RESULT:     "RESULT",
  VERIFY_ID:  "VERIFY_ID",
  VERIFY_PIN: "VERIFY_PIN",
  DONE:       "DONE",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit" });
}

// ── Row helper ────────────────────────────────────────────────────────────────
function Row({ label, value, mono, accent }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold flex-shrink-0">{label}</span>
      <span className={`text-sm text-right ${mono ? "font-mono tracking-wider" : "font-semibold"} ${accent ?? "text-gray-800"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ── Blacklist Alert ───────────────────────────────────────────────────────────
function BlacklistAlert({ entry, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500">
        <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
          <ShieldAlert size={24} className="text-white flex-shrink-0" />
          <div>
            <p className="text-white font-black uppercase tracking-widest text-sm">Blacklisted</p>
            <p className="text-red-200 text-[10px] uppercase tracking-widest">Do not allow entry</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">Subject</p>
            <p className="text-base font-black uppercase text-red-700">{entry.subjectName}</p>
            <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mt-3 mb-1">Reason</p>
            <p className="text-sm text-red-600">{entry.reason}</p>
          </div>
          <button
            onClick={onDismiss}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-colors"
          >
            Acknowledge & Deny Entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manual Override Modal ─────────────────────────────────────────────────────
function ManualOverrideModal({ residents, activeVisitors, onConfirm, onClose }) {
  const [type, setType]         = useState("resident");
  const [selected, setSelected] = useState("");
  const [saving, setSaving]     = useState(false);

  const options = type === "resident"
    ? residents.filter((r) => r.isInside)
    : activeVisitors.filter((v) => !v.isUsed && v.status === "approved");

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try { await onConfirm(type, selected); onClose(); }
    catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-gray-900">Manual Time-Out</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Force close an open entry record</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {["resident", "visitor"].map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setSelected(""); }}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-colors ${
                  type === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Select {type}
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 rounded-xl outline-none focus:border-gray-900 transition-colors"
            >
              <option value="">Choose...</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {type === "resident"
                    ? `${item.name} — ${item.residentId} (${item.unit})`
                    : `${item.visitorName} — ${item.visitorId}`
                  }
                </option>
              ))}
            </select>
            {options.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-2">
                No {type === "resident" ? "residents currently inside" : "active visitor passes"}
              </p>
            )}
          </div>
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black disabled:bg-gray-300 transition-colors"
          >
            {saving ? "Processing..." : "Confirm Manual Time-Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({ id, icon: Icon, label, active, onClick }) { // eslint-disable-line
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-4 px-5 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
        active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon size={18} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

// ── PIN Input (masked, numeric) ───────────────────────────────────────────────
function PinInput({ value, onChange }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="relative">
      <input
        type={revealed ? "text" : "password"}
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••"
        className="w-full border border-gray-200 bg-gray-50 text-center text-2xl font-black tracking-[0.4em] px-4 py-4 rounded-xl outline-none focus:border-gray-900 transition-colors pr-12"
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
      >
        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="text-right">
      <p className="text-base font-black text-white tabular-nums">{timeStr}</p>
      <p className="text-[9px] text-gray-500 uppercase tracking-widest">{dateStr}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GuardDashboard() {
  const { userData, logout } = useAuth();

  const [tab, setTab]               = useState("scanner");
  const [menuOpen, setMenuOpen]     = useState(false);
  const [scanState, setScanState]   = useState(SCAN_STATE.IDLE);
  const [scanData, setScanData]     = useState(null);
  const [scanType, setScanType]     = useState(null);
  const [blacklistEntry, setBlacklist] = useState(null);
  const [action, setAction]         = useState("entry");
  const [logLoading, setLogLoading] = useState(false);
  const [doneData, setDoneData]     = useState(null);
  const [error, setError]           = useState("");

  // ID verification fields (visitor only)
  const [idType, setIdType]     = useState(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");

  // PIN verification fields
  const [pinInput, setPinInput]     = useState("");
  const [pinError, setPinError]     = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // For visitor PIN step: look up the host resident
  const [hostResident, setHostResident] = useState(null);

  // Manual override data
  const [showOverride, setShowOverride] = useState(false);
  const [residents, setResidents]       = useState([]);
  const [activeVisitors, setActiveVisitors] = useState([]);

  // Session activity log
  const [recentLogs, setRecentLogs] = useState([]);

  const scannerRef         = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [res, vis] = await Promise.all([getAllResidents(), getAllVisitorRequests()]);
        setResidents(res);
        setActiveVisitors(vis);
      } catch { /* silent */ }
    }
    load();
  }, []);

  // ── Scanner ──────────────────────────────────────────────────────────────────
  const startScanner = async () => {
    setScanState(SCAN_STATE.SCANNING);
    setError("");
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerInstanceRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          handleQRResult,
          () => {}
        );
      } catch {
        setError("Camera access denied or unavailable.");
        setScanState(SCAN_STATE.IDLE);
      }
    }, 100);
  };

  const stopScanner = async () => {
    try {
      if (scannerInstanceRef.current) {
        await scannerInstanceRef.current.stop();
        scannerInstanceRef.current = null;
      }
    } catch { /* already stopped */ }
  };

  useEffect(() => () => { stopScanner(); }, []);

  // ── QR Result handler ─────────────────────────────────────────────────────────
  const handleQRResult = async (decodedText) => {
    await stopScanner();
    setError("");
    try {
      let doc = await getResidentByResidentId(decodedText);
      if (doc) {
        const bl = await checkBlacklist(doc.residentId);
        if (bl) { setBlacklist({ ...bl, subjectName: doc.name }); setScanState(SCAN_STATE.IDLE); return; }
        setScanData(doc);
        setScanType("resident");
        setAction(doc.isInside ? "exit" : "entry");
        setScanState(SCAN_STATE.RESULT);
        return;
      }
      doc = await getVisitorRequestByVisitorId(decodedText);
      if (doc) {
        if (doc.isUsed)                { setError("This visitor pass has already been used."); setScanState(SCAN_STATE.IDLE); return; }
        if (doc.status !== "approved") { setError("This visitor request is not approved.");    setScanState(SCAN_STATE.IDLE); return; }
        const bl = await checkBlacklist(doc.visitorId);
        if (bl) { setBlacklist({ ...bl, subjectName: doc.visitorName }); setScanState(SCAN_STATE.IDLE); return; }
        setScanData(doc);
        setScanType("visitor");
        setAction("entry");
        setScanState(SCAN_STATE.RESULT);
        return;
      }
      setError("QR code not recognized.");
      setScanState(SCAN_STATE.IDLE);
    } catch {
      setError("Failed to verify QR. Please try again.");
      setScanState(SCAN_STATE.IDLE);
    }
  };

  // ── Proceed from RESULT ───────────────────────────────────────────────────────
  const handleProceedFromResult = () => {
    setPinInput("");
    setPinError("");
    if (scanType === "resident") {
      setScanState(SCAN_STATE.VERIFY_PIN);
    } else {
      setIdType(ID_TYPES[0]);
      setIdNumber("");
      setScanState(SCAN_STATE.VERIFY_ID);
    }
  };

  // ── Proceed from VERIFY_ID → fetch host resident → PIN step ──────────────────
  const handleProceedFromId = async () => {
    if (!idNumber.trim()) return;
    setPinLoading(true);
    setPinError("");
    try {
      const host = await getResidentByResidentId(scanData.residentId);
      if (!host) { setPinError("Host resident not found in system."); setPinLoading(false); return; }
      setHostResident(host);
      setPinInput("");
      setScanState(SCAN_STATE.VERIFY_PIN);
    } catch {
      setPinError("Failed to load host resident. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  // ── PIN verification + final log ──────────────────────────────────────────────
  const handleVerifyPin = async () => {
    if (pinInput.length !== 6) { setPinError("Enter the 6-digit PIN."); return; }
    setPinLoading(true);
    setPinError("");
    try {
      const targetDoc = scanType === "resident" ? scanData : hostResident;
      const valid = await verifyResidentPin(targetDoc.id, pinInput);
      if (!valid) { setPinError("Incorrect PIN. Please try again."); setPinLoading(false); return; }
      await commitLog();
    } catch {
      setPinError("Verification failed. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  // ── Write entry log ───────────────────────────────────────────────────────────
  const commitLog = async () => {
    setLogLoading(true);
    try {
      const isResident  = scanType === "resident";
      const subjectId   = isResident ? scanData.residentId : scanData.visitorId;
      const subjectName = isResident ? scanData.name       : scanData.visitorName;
      const unit        = isResident ? scanData.unit       : scanData.residentUnit;

      await createEntryLog({
        type: scanType, subjectId, subjectName, residentUnit: unit, action,
        idTypePresented:   isResident ? "—" : idType,
        idNumberPresented: isResident ? "—" : idNumber,
        guardUid:   userData?.email ?? "",
        guardName:  userData?.name  ?? "",
        isBlacklisted:    false,
        isManuallyClosed: false,
      });

      if (isResident)  await setResidentInsideStatus(scanData.id, action === "entry");
      if (!isResident) await closeVisitorPass(scanData.id);

      setDoneData({ action, name: subjectName, type: scanType });
      setRecentLogs((prev) => [{
        id: Date.now().toString(),
        action, subjectName, subjectId, type: scanType,
        residentUnit: unit, guardName: userData?.name,
        timestamp: new Date(),
      }, ...prev.slice(0, 19)]);
      setScanState(SCAN_STATE.DONE);
    } catch {
      setError("Failed to log entry. Please try again.");
      setScanState(SCAN_STATE.RESULT);
    } finally {
      setLogLoading(false);
    }
  };

  // ── Manual override ───────────────────────────────────────────────────────────
  const handleManualOverride = async (type, docId) => {
    const isResident = type === "resident";
    let subjectName = "", subjectId = "", unit = "";
    if (isResident) {
      const r = residents.find((x) => x.id === docId);
      subjectName = r?.name ?? ""; subjectId = r?.residentId ?? ""; unit = r?.unit ?? "";
      await setResidentInsideStatus(docId, false);
    } else {
      const v = activeVisitors.find((x) => x.id === docId);
      subjectName = v?.visitorName ?? ""; subjectId = v?.visitorId ?? ""; unit = v?.residentUnit ?? "";
      await closeVisitorPass(docId);
    }
    await createEntryLog({
      type, subjectId, subjectName, residentUnit: unit,
      action: "manual_close",
      idTypePresented: "—", idNumberPresented: "—",
      guardUid:  userData?.email ?? "",
      guardName: userData?.name  ?? "",
      isBlacklisted: false, isManuallyClosed: true,
    });
    setRecentLogs((prev) => [{
      id: Date.now().toString(),
      action: "manual_close", subjectName, subjectId, type,
      residentUnit: unit, guardName: userData?.name,
      timestamp: new Date(),
    }, ...prev.slice(0, 19)]);
  };

  const resetScan = () => {
    setScanState(SCAN_STATE.IDLE);
    setScanData(null); setScanType(null); setDoneData(null);
    setIdNumber(""); setIdType(ID_TYPES[0]);
    setPinInput(""); setPinError(""); setHostResident(null);
    setError("");
  };

  const navItems = [
    { id: "scanner", icon: QrCode,        label: "Scanner"  },
    { id: "logs",    icon: ClipboardList,  label: "Activity" },
  ];

  const stepLabel = (() => {
    if (scanState === SCAN_STATE.RESULT)     return "Step 1 — Scan Result";
    if (scanState === SCAN_STATE.VERIFY_ID)  return "Step 2 — Physical ID Verification";
    if (scanState === SCAN_STATE.VERIFY_PIN) {
      return scanType === "resident"
        ? "Step 2 — Resident PIN Verification"
        : "Step 3 — Resident PIN Verification";
    }
    return "";
  })();

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-mono">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-gray-900 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-gray-500">Guard Terminal</p>
          <p className="text-sm font-black uppercase tracking-tight text-white leading-tight">
            {userData?.name ?? "—"}
          </p>
          {userData?.post && (
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{userData.post}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl hover:bg-white/10 text-gray-400 transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Collapsible Menu ── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-[73px] left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg">
            <nav>
              {navItems.map((item) => (
                <NavItem
                  key={item.id} {...item}
                  active={tab === item.id}
                  onClick={(id) => { setTab(id); setMenuOpen(false); }}
                />
              ))}
              <NavItem
                id="override" icon={UserX} label="Manual Time-Out" active={false}
                onClick={() => { setShowOverride(true); setMenuOpen(false); }}
              />
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

      {/* ── Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {navItems.map(({ id, icon: Icon, label }) => ( // eslint-disable-line
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
              tab === id ? "text-gray-900" : "text-gray-400"
            }`}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.5} />
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowOverride(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
        >
          <UserX size={20} strokeWidth={1.5} />
          Override
        </button>
      </nav>

      {/* ── Main Content ── */}
      <main className="pb-24 px-5 pt-6 max-w-lg mx-auto">

        {/* ════ SCANNER TAB ════ */}
        {tab === "scanner" && (
          <div className="space-y-4">

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-bold uppercase tracking-wider">{error}</p>
                </div>
                <button onClick={() => setError("")}><X size={14} className="text-red-400" /></button>
              </div>
            )}

            {/* Step label */}
            {stepLabel && (
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-gray-400" />
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{stepLabel}</span>
              </div>
            )}

            {/* ── IDLE ── */}
            {scanState === SCAN_STATE.IDLE && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <ScanLine size={32} className="text-gray-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Ready</p>
                  <p className="text-xl font-black uppercase tracking-tight text-gray-900 mb-1">QR Scanner</p>
                  <p className="text-xs text-gray-400 mb-6">Scan resident or visitor QR code</p>
                  <button
                    onClick={startScanner}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    Start Scanner
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-gray-900">
                      {recentLogs.filter((l) => l.action === "entry").length}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Entries Today</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-gray-900">
                      {recentLogs.filter((l) => l.action === "exit").length}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Exits Today</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SCANNING ── */}
            {scanState === SCAN_STATE.SCANNING && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-gray-900 px-5 py-3 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-white">Scanning...</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Live</span>
                    </div>
                  </div>
                  <div id="qr-reader" ref={scannerRef} className="w-full" />
                </div>
                <button
                  onClick={() => { stopScanner(); setScanState(SCAN_STATE.IDLE); }}
                  className="w-full border border-gray-200 bg-white py-4 rounded-xl text-sm font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ── RESULT ── */}
            {scanState === SCAN_STATE.RESULT && scanData && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck size={16} className="text-green-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-green-600">QR Verified</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className={`px-5 py-3 ${scanType === "resident" ? "bg-gray-900" : "bg-gray-700"}`}>
                    <p className="text-[9px] uppercase tracking-widest text-gray-400">
                      {scanType === "resident" ? "Resident" : "Visitor Pass"}
                    </p>
                    <p className="text-base font-black uppercase tracking-tight text-white mt-0.5">
                      {scanType === "resident" ? scanData.name : scanData.visitorName}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {scanType === "resident" ? (
                      <>
                        <Row label="Resident ID" value={scanData.residentId} mono />
                        <Row label="Unit"        value={scanData.unit} />
                        <Row label="Status"
                          value={scanData.isInside ? "Currently Inside" : "Currently Outside"}
                          accent={scanData.isInside ? "text-green-600" : "text-gray-500"}
                        />
                      </>
                    ) : (
                      <>
                        <Row label="Visitor ID"  value={scanData.visitorId} mono />
                        <Row label="Purpose"     value={scanData.purpose} />
                        <Row label="Resident"    value={scanData.residentName} />
                        <Row label="Unit"        value={scanData.residentUnit} />
                        <Row label="Scheduled"   value={`${scanData.expectedDate} · ${scanData.expectedTime}`} />
                      </>
                    )}
                  </div>
                </div>

                {/* Action toggle — residents only */}
                {scanType === "resident" && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Action</p>
                    <div className="flex gap-2">
                      {["entry", "exit"].map((a) => (
                        <button
                          key={a}
                          onClick={() => setAction(a)}
                          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-colors ${
                            action === a
                              ? "bg-gray-900 text-white border-gray-900"
                              : "border-gray-200 text-gray-500 hover:border-gray-400"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleProceedFromResult}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    {scanType === "resident" ? "Verify PIN" : "Verify ID"}
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={resetScan}
                    className="px-4 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── VERIFY_ID (visitor only) ── */}
            {scanState === SCAN_STATE.VERIFY_ID && scanData && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                    Visitor: {scanData.visitorName}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-300 mb-5">
                    Visiting: {scanData.residentName} · Unit {scanData.residentUnit}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                        ID Type Presented
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 rounded-xl outline-none focus:border-gray-900 transition-colors"
                      >
                        {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                        ID Number
                      </label>
                      <input
                        type="text"
                        required
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="Enter ID number as shown"
                        className="w-full border border-gray-200 bg-gray-50 text-sm px-4 py-3 rounded-xl outline-none focus:border-gray-900 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {pinError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl font-bold uppercase tracking-wider">
                    {pinError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleProceedFromId}
                    disabled={!idNumber.trim() || pinLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black disabled:bg-gray-400 transition-colors"
                  >
                    {pinLoading ? "Loading..." : "Next: Verify PIN"}
                    {!pinLoading && <ChevronRight size={16} />}
                  </button>
                  <button
                    onClick={() => setScanState(SCAN_STATE.RESULT)}
                    className="px-4 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── VERIFY_PIN ── */}
            {scanState === SCAN_STATE.VERIFY_PIN && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  {scanType === "resident" ? (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                        Resident PIN
                      </p>
                      <p className="text-xs text-gray-400 mb-5">
                        Ask <span className="font-black text-gray-700">{scanData?.name}</span> to type their PIN on your screen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                        Host Resident PIN
                      </p>
                      <p className="text-xs text-gray-400 mb-5">
                        Ask <span className="font-black text-gray-700">{hostResident?.name}</span> (Unit {hostResident?.unit}) to type their PIN to authorize this visitor.
                      </p>
                    </>
                  )}

                  <PinInput
                    value={pinInput}
                    onChange={(v) => { setPinInput(v); setPinError(""); }}
                  />

                  {pinError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl font-bold uppercase tracking-wider mt-3">
                      {pinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyPin}
                    disabled={pinInput.length !== 6 || pinLoading || logLoading}
                    className="flex-1 bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black disabled:bg-gray-400 transition-colors"
                  >
                    {(pinLoading || logLoading) ? "Verifying..." : "Confirm & Log"}
                  </button>
                  <button
                    onClick={() => {
                      setPinInput(""); setPinError("");
                      setScanState(scanType === "resident" ? SCAN_STATE.RESULT : SCAN_STATE.VERIFY_ID);
                    }}
                    className="px-4 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── DONE ── */}
            {scanState === SCAN_STATE.DONE && doneData && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className={`px-5 py-4 flex items-center gap-3 ${
                  doneData.action === "entry" ? "bg-green-600"
                  : doneData.action === "exit" ? "bg-gray-700"
                  : "bg-yellow-600"
                }`}>
                  <CheckCircle2 size={22} className="text-white flex-shrink-0" />
                  <div>
                    <p className="text-white font-black uppercase tracking-widest text-sm">
                      {doneData.action === "entry" ? "Entry Logged"
                        : doneData.action === "exit" ? "Exit Logged"
                        : "Manually Closed"}
                    </p>
                    <p className="text-white/70 text-[10px] uppercase tracking-widest">{doneData.name}</p>
                  </div>
                </div>
                <div className="p-5">
                  <button
                    onClick={resetScan}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    Scan Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ACTIVITY TAB ════ */}
        {tab === "logs" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Activity</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                {recentLogs.length} logs this session
              </p>
            </div>

            {recentLogs.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                <p className="text-xs uppercase tracking-widest text-gray-300 font-bold">No activity yet this session</p>
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black uppercase ${
                    log.action === "entry"  ? "bg-green-100 text-green-700"
                    : log.action === "exit" ? "bg-red-50 text-red-600"
                    : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {log.action === "entry" ? "IN" : log.action === "exit" ? "OUT" : "MC"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight text-gray-900 truncate">{log.subjectName}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">
                      {log.type} · {log.residentUnit ?? "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-700">{formatTime(log.timestamp)}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(log.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ── Blacklist Alert ── */}
      {blacklistEntry && (
        <BlacklistAlert
          entry={blacklistEntry}
          onDismiss={() => { setBlacklist(null); resetScan(); }}
        />
      )}

      {/* ── Manual Override Modal ── */}
      {showOverride && (
        <ManualOverrideModal
          residents={residents}
          activeVisitors={activeVisitors}
          onConfirm={handleManualOverride}
          onClose={() => setShowOverride(false)}
        />
      )}
    </div>
  );
}