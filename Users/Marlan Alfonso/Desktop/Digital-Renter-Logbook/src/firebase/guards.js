// src/firebase/guards.js
import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Get All Guards ───────────────────────────────────────────────────────────
export async function getAllGuards() {
  const q    = query(collection(db, "guards"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Get Guard by doc ID (email) ──────────────────────────────────────────────
export async function getGuard(docId) {
  const snap = await getDoc(doc(db, "guards", docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Get Guard by Email (used after Google Sign-In) ───────────────────────────
export async function getGuardByEmail(email) {
  const q    = query(collection(db, "guards"), where("email", "==", email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ─── Add Guard (Firestore only — Google Sign-In) ──────────────────────────────
export async function addGuard({ name, email, post, shiftStart, shiftEnd }) {
  const docId = email.toLowerCase().trim();
  await setDoc(doc(db, "guards", docId), {
    name,
    email:      docId,
    role:       "guard",
    status:     "active",
    post,
    shiftStart,
    shiftEnd,
    createdAt:  serverTimestamp(),
  });
  return docId;
}

// ─── Update Guard ─────────────────────────────────────────────────────────────
export async function updateGuard(docId, updates) {
  const allowed = ["name", "post", "shiftStart", "shiftEnd", "status"];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  await updateDoc(doc(db, "guards", docId), filtered);
}

// ─── Set Guard Status ─────────────────────────────────────────────────────────
export async function setGuardStatus(docId, status) {
  await updateDoc(doc(db, "guards", docId), { status });
}

// ─── Check if Guard is On Shift ───────────────────────────────────────────────
export function isGuardOnShift(shiftStart, shiftEnd) {
  const now            = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = shiftStart.split(":").map(Number);
  const [endH, endM]     = shiftEnd.split(":").map(Number);
  const startMinutes   = startH * 60 + startM;
  const endMinutes     = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

// ─── Get On-Duty Guards ───────────────────────────────────────────────────────
export async function getOnDutyGuards() {
  const guards = await getAllGuards();
  return guards.filter(
    (g) => g.status === "active" && isGuardOnShift(g.shiftStart, g.shiftEnd)
  );
}