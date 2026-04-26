// src/firebase/auth.js
// Google Sign-In only — no email/password auth.
// Admin and Guard accounts are created manually in Firestore.
// Residents are registered by admin via RegisterResident page.

import { signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

export const GUARD_POSTS = ["Entrance 1", "Entrance 2", "Exit Gate"];

// ─── Google Sign-In ───────────────────────────────────────────────────────────
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
}

// ─── Create Admin account (Firestore only — admin signs in via Google) ────────
// Run this once manually or via a setup script. Email must match their Google account.
export async function createAdminRecord({ name, email }) {
  const docId = email.toLowerCase().trim();
  await setDoc(doc(db, "admins", docId), {
    name,
    email: docId,
    role:      "admin",
    status:    "active",
    createdAt: serverTimestamp(),
  });
}

// ─── Create Guard account (Firestore only — guard signs in via Google) ────────
export async function createGuardRecord({ name, email, post, shiftStart, shiftEnd }) {
  if (!GUARD_POSTS.includes(post)) {
    throw new Error(`Invalid post. Must be one of: ${GUARD_POSTS.join(", ")}`);
  }
  const docId = email.toLowerCase().trim();
  await setDoc(doc(db, "guards", docId), {
    name,
    email: docId,
    role:       "guard",
    status:     "active",
    post,
    shiftStart,
    shiftEnd,
    createdAt:  serverTimestamp(),
  });
}