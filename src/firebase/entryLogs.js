// src/firebase/entryLogs.js
// Immutable audit trail for all entry/exit events

import {
  addDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Create Entry Log (Guard) ────────────────────────────────────────────────
// Called on every scan. Never updated or deleted.
export async function createEntryLog({
  type,               // "resident" | "visitor"
  subjectId,          // residentId or visitorId string
  subjectName,
  residentUnit,
  action,             // "entry" | "exit" | "manual_close"
  idTypePresented,    // e.g. "Driver's License"
  idNumberPresented,
  guardUid,
  guardName,
  isBlacklisted,      // boolean snapshot at scan time
  isManuallyClosed,   // boolean
}) {
  const docRef = await addDoc(collection(db, "entryLogs"), {
    type,
    subjectId,
    subjectName,
    residentUnit,
    action,
    idTypePresented,
    idNumberPresented,
    guardUid,
    guardName,
    isBlacklisted,
    isManuallyClosed,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Get All Logs (Admin) ─────────────────────────────────────────────────────
export async function getAllEntryLogs() {
  const q = query(collection(db, "entryLogs"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Logs by Date Range (Admin Reporting) ─────────────────────────────────
export async function getLogsByDateRange(startDate, endDate) {
  const q = query(
    collection(db, "entryLogs"),
    where("timestamp", ">=", startDate),
    where("timestamp", "<=", endDate),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Logs by Unit ─────────────────────────────────────────────────────────
export async function getLogsByUnit(unit) {
  const q = query(
    collection(db, "entryLogs"),
    where("residentUnit", "==", unit),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Logs by Guard ────────────────────────────────────────────────────────
export async function getLogsByGuard(guardUid) {
  const q = query(
    collection(db, "entryLogs"),
    where("guardUid", "==", guardUid),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Logs by Resident (Resident Dashboard) ────────────────────────────────
export async function getLogsByResidentId(residentId) {
  const q = query(
    collection(db, "entryLogs"),
    where("subjectId", "==", residentId),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Recent Logs (Admin Dashboard widget) ──────────────────────────────────
export async function getRecentLogs(count = 10) {
  const q = query(
    collection(db, "entryLogs"),
    orderBy("timestamp", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}