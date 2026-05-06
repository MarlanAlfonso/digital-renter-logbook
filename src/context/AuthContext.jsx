// src/context/AuthContext.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AuthContext } from "./authContextObject";

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userRole, setUserRole]       = useState(null);
  const [userData, setUserData]       = useState(null);
  const [userName, setUserName]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);

      if (firebaseUser) {
        try {
          const email = firebaseUser.email.toLowerCase().trim();
          let data = null;
          let role = null;

          // 1. Check admins — doc ID is email
          const adminSnap = await getDoc(doc(db, "admins", email));
          if (adminSnap.exists()) {
            data = adminSnap.data();
            role = "admin";
          }

          // 2. Check guards — doc ID is email
          if (!data) {
            const guardSnap = await getDoc(doc(db, "guards", email));
            if (guardSnap.exists()) {
              data = guardSnap.data();
              role = "guard";
            }
          }

          // 3. Check residents — doc ID is email
          if (!data) {
            const residentSnap = await getDoc(doc(db, "residents", email));
            if (residentSnap.exists()) {
              data = residentSnap.data();
              role = "resident";
            }
          }

          if (!data) {
            setAccessError("Your Google account is not registered in this system.");
            setUser(null);
            await signOut(auth);
          } else if (data.status === "inactive") {
            setAccessError("Your account has been deactivated.");
            setUser(null);
            await signOut(auth);
          } else {
            setUser(firebaseUser);
            setUserRole(role);
            setUserName(data.name);
            setUserData(data);
            setAccessError(null);
          }
        } catch (err) {
          console.error("Auth Verification Error:", err);
          setAccessError("An error occurred while verifying your account.");
          setUser(null);
          await signOut(auth);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setUserData(null);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try { await signOut(auth); }
    catch (err) { console.error("Logout Error:", err); }
  };

  return (
    <AuthContext.Provider value={{
      user, userRole, userName, userData,
      authLoading, accessError, setAccessError, logout,
    }}>
      {!authLoading && children}
    </AuthContext.Provider>
  );
}