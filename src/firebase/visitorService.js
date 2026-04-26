// src/firebase/visitorService.js
import {
  doc, addDoc, getDocs, updateDoc,
  collection, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── ID Generation ────────────────────────────────────────────────────────────
async function generateVisitorId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix  = `VIS-${dateStr}`;
  const q = query(
    collection(db, "visitorRequests"),
    where("visitorId", ">=", `${prefix}-`),
    where("visitorId", "<=", `${prefix}-\uf8ff`)
  );
  const snap     = await getDocs(q);
  const sequence = (snap.size + 1).toString().padStart(4, "0");
  return `${prefix}-${sequence}`;
}

// ─── Submit Visitor Request (Resident) ───────────────────────────────────────
export async function submitVisitorRequest({
  visitorName, purpose, expectedDate, expectedTime,
  residentEmail, residentId, residentUnit, residentName,
}) {
  const docRef = await addDoc(collection(db, "visitorRequests"), {
    visitorName,
    purpose,
    expectedDate,
    expectedTime,
    residentEmail,   // doc ID of resident (email)
    residentId,      // e.g. 2026-301A-0001
    residentUnit,
    residentName,
    status:          "pending",
    rejectionReason: null,
    visitorId:       null,
    qrCodeData:      null,
    isUsed:          false,
    createdAt:       serverTimestamp(),
  });
  return docRef.id;
}

// ─── Get All Requests ─────────────────────────────────────────────────────────
export async function getAllVisitorRequests() {
  const q    = query(collection(db, "visitorRequests"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get by Status ────────────────────────────────────────────────────────────
export async function getVisitorRequestsByStatus(status) {
  const q    = query(
    collection(db, "visitorRequests"),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Pending (Admin Dashboard KPI) ───────────────────────────────────────
export async function getPendingVisitorRequests() {
  return getVisitorRequestsByStatus("pending");
}

// ─── Get by Resident Email ────────────────────────────────────────────────────
export async function getVisitorRequestsByResident(residentEmail) {
  const q    = query(
    collection(db, "visitorRequests"),
    where("residentEmail", "==", residentEmail),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Approve (Admin) — generates Visitor ID + QR ─────────────────────────────
export async function approveVisitorRequest(requestDocId) {
  const visitorId  = await generateVisitorId();
  const qrCodeData = visitorId;
  await updateDoc(doc(db, "visitorRequests", requestDocId), {
    status: "approved", rejectionReason: null, visitorId, qrCodeData,
  });
  return { visitorId, qrCodeData };
}

// ─── Reject (Admin) ───────────────────────────────────────────────────────────
export async function rejectVisitorRequest(requestDocId, reason = "") {
  await updateDoc(doc(db, "visitorRequests", requestDocId), {
    status: "rejected", rejectionReason: reason || null,
  });
}

// ─── Get by Visitor ID (Guard Scanner) ───────────────────────────────────────
export async function getVisitorRequestByVisitorId(visitorId) {
  const q    = query(collection(db, "visitorRequests"), where("visitorId", "==", visitorId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ─── Close Visit (Guard) ──────────────────────────────────────────────────────
export async function closeVisitorPass(requestDocId) {
  await updateDoc(doc(db, "visitorRequests", requestDocId), { isUsed: true });
}