// src/firebase/residents.js
// Google Sign-In architecture — no password creation needed.
// Admin saves resident info to Firestore only.
// Resident logs in via Google; AuthContext matches by email.
import {
  doc, setDoc, getDoc, getDocs, updateDoc,
  collection, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── PIN Generation ───────────────────────────────────────────────────────────
export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── PIN Verification (Guard use) ────────────────────────────────────────────
export async function verifyResidentPin(docId, pin) {
  const snap = await getDoc(doc(db, "residents", docId));
  if (!snap.exists()) return false;
  return snap.data().pin === pin;
}

// ─── Change PIN (Resident use) ────────────────────────────────────────────────
// docId = email (used as Firestore doc ID). Verifies currentPin before updating.
export async function changeResidentPin(docId, currentPin, newPin) {
  const snap = await getDoc(doc(db, "residents", docId));
  if (!snap.exists()) throw new Error("Resident record not found.");
  if (snap.data().pin !== currentPin) throw new Error("Current PIN is incorrect.");
  await updateDoc(doc(db, "residents", docId), { pin: newPin });
}

// ─── ID Generation ────────────────────────────────────────────────────────────
export async function generateResidentId(unit) {
  const year   = new Date().getFullYear();
  const prefix = `${year}-${unit}`;
  const q = query(
    collection(db, "residents"),
    where("residentId", ">=", `${prefix}-`),
    where("residentId", "<=", `${prefix}-\uf8ff`)
  );
  const snap     = await getDocs(q);
  const sequence = (snap.size + 1).toString().padStart(4, "0");
  return `${prefix}-${sequence}`;
}

// ─── Register Resident (Admin only — no Auth creation) ───────────────────────
// Uses email as the document ID so AuthContext can look it up easily.
export async function registerResident({
  name, email, unit,
  moveInDate = "", emergencyContact = "",
}) {
  const residentId = await generateResidentId(unit.toUpperCase());
  const pin        = generatePin();
  const docId      = email.toLowerCase().trim();

  await setDoc(doc(db, "residents", docId), {
    name,
    email:            email.toLowerCase().trim(),
    role:             "resident",
    residentId,
    unit:             unit.toUpperCase(),
    status:           "active",
    isInside:         false,
    qrCodeData:       residentId,
    pin,
    moveInDate:       moveInDate || null,
    emergencyContact: emergencyContact || null,
    createdAt:        serverTimestamp(),
  });

  return { residentId, pin };
}

// ─── Get Single Resident by doc ID (email) ────────────────────────────────────
export async function getResident(docId) {
  const snap = await getDoc(doc(db, "residents", docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Get Resident by residentId string (Guard QR scan) ───────────────────────
export async function getResidentByResidentId(residentId) {
  const q    = query(collection(db, "residents"), where("residentId", "==", residentId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ─── Get All Residents ────────────────────────────────────────────────────────
export async function getAllResidents() {
  const q    = query(collection(db, "residents"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Update Resident ──────────────────────────────────────────────────────────
export async function updateResident(docId, updates) {
  await updateDoc(doc(db, "residents", docId), updates);
}

// ─── Deactivate / Reactivate ──────────────────────────────────────────────────
export async function setResidentStatus(docId, status) {
  await updateDoc(doc(db, "residents", docId), { status });
}

// ─── Update isInside flag (Guard scan) ───────────────────────────────────────
export async function setResidentInsideStatus(docId, isInside) {
  await updateDoc(doc(db, "residents", docId), { isInside });
}

// ─── Regenerate QR ───────────────────────────────────────────────────────────
export async function regenerateResidentQR(docId, residentId) {
  const newQrData = `${residentId}-${Date.now()}`;
  await updateDoc(doc(db, "residents", docId), { qrCodeData: newQrData });
  return newQrData;
}