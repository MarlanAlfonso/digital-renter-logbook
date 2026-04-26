// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAt5m08EJnypV5paiDftjV6Y6KGHY23HSc",
  authDomain: "digital-renter-logbook-90c66.firebaseapp.com",
  projectId: "digital-renter-logbook-90c66",
  storageBucket: "digital-renter-logbook-90c66.firebasestorage.app",
  messagingSenderId: "967731405651",
  appId: "1:967731405651:web:e4f8026f97184122fff7a6",
  measurementId: "G-C2QV65ZDHT",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();