// src/firebase/shifts.js
// Shift schedule — stored as full datetime strings (YYYY-MM-DDTHH:MM).
// Enforces no overlapping shifts per guard (handles overnight shifts correctly).
// Collection: shifts/{docId}
// Doc shape: { guardId, shiftStart, shiftEnd, post, createdAt }

import {
  collection, doc, addDoc, deleteDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ── Get all shifts ────────────────────────────────────────────────────────────
export async function getAllShifts() {
  const q    = query(collection(db, "shifts"), orderBy("shiftStart", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Add shift — enforces no overlapping shifts per guard ──────────────────────
// shiftStart / shiftEnd are "YYYY-MM-DDTHH:MM" strings (local time, no timezone).
export async function addShift({ guardId, shiftStart, shiftEnd, post }) {
  // Fetch all existing shifts for this guard
  const q    = query(collection(db, "shifts"), where("guardId", "==", guardId));
  const snap = await getDocs(q);

  // Overlap: new shift starts before an existing one ends AND ends after it starts
  const conflict = snap.docs.find((d) => {
    const s = d.data();
    return shiftStart < s.shiftEnd && shiftEnd > s.shiftStart;
  });

  if (conflict) {
    const s = conflict.data();
    throw new Error(
      `Shift overlaps with an existing shift: ${formatDT(s.shiftStart)} – ${formatDT(s.shiftEnd)}.`
    );
  }

  const ref = await addDoc(collection(db, "shifts"), {
    guardId,
    shiftStart,
    shiftEnd,
    post:      post || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Delete shift ──────────────────────────────────────────────────────────────
export async function deleteShift(shiftId) {
  await deleteDoc(doc(db, "shifts", shiftId));
}

// ── Helper: format "YYYY-MM-DDTHH:MM" → "Apr 26 · 11:00 PM" ─────────────────
export function formatDT(dt) {
  if (!dt) return "—";
  const [datePart, timePart] = dt.split("T");
  const [y, m, d]  = datePart.split("-").map(Number);
  const [hh, mm]   = timePart.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12  = hh % 12 || 12;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${monthNames[m - 1]} ${d} · ${h12}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

// ── Helper: extract date key "YYYY-MM-DD" from datetime string ────────────────
export function dateKeyOf(dt) {
  return dt ? dt.slice(0, 10) : "";
}