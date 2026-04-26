// src/firebase/posts.js
import {
  doc, addDoc, deleteDoc, getDocs,
  collection, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Get All Posts ────────────────────────────────────────────────────────────
export async function getAllPosts() {
  const q    = query(collection(db, "posts"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Add Post ─────────────────────────────────────────────────────────────────
export async function addPost(name) {
  const docRef = await addDoc(collection(db, "posts"), {
    name:      name.trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Delete Post ──────────────────────────────────────────────────────────────
export async function deletePost(postId) {
  await deleteDoc(doc(db, "posts", postId));
}