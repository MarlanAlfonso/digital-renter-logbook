// src/firebase/blacklist.js
import {
  doc, addDoc, deleteDoc, getDocs,
  collection, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Add to Blacklist ─────────────────────────────────────────────────────────
export async function addToBlacklist({
  subjectType,   // "resident" | "visitor"
  subjectId,     // residentId (e.g. 2026-301A-0001) or visitorId (VIS-...)
  subjectName,
  reason,
  addedByEmail,
  addedByName,
}) {
  const docRef = await addDoc(collection(db, "blacklist"), {
    subjectType,
    subjectId,
    subjectName,
    reason,
    addedByEmail,
    addedByName,
    addedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Remove from Blacklist ────────────────────────────────────────────────────
export async function removeFromBlacklist(blacklistDocId) {
  await deleteDoc(doc(db, "blacklist", blacklistDocId));
}

// ─── Get All Blacklisted ──────────────────────────────────────────────────────
export async function getAllBlacklisted() {
  const q    = query(collection(db, "blacklist"), orderBy("addedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Check if Subject is Blacklisted (Guard Scanner) ─────────────────────────
export async function checkBlacklist(subjectId) {
  const q    = query(collection(db, "blacklist"), where("subjectId", "==", subjectId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}