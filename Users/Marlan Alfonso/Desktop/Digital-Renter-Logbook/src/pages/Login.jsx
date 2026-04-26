// src/pages/Login.jsx
import { useState, useEffect, useRef } from "react";
import { signInWithPopup, browserSessionPersistence, setPersistence } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { getGuardByEmail, isGuardOnShift } from "../firebase/guards";

const ROLE_ROUTES = {
  admin:    "/admin",
  guard:    "/guard",
  resident: "/resident",
};

export default function Login() {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const { user, userRole, authLoading, accessError, setAccessError } = useAuth();
  const navigate = useNavigate();

  // Redirect already-logged-in users
  useEffect(() => {
    if (!authLoading && user && userRole) {
      navigate(ROLE_ROUTES[userRole] ?? "/login", { replace: true });
    }
  }, [user, userRole, authLoading, navigate]);

  // Surface errors from AuthContext
  const accessErrorRef = useRef(accessError);
  useEffect(() => { accessErrorRef.current = accessError; });
  useEffect(() => {
    if (accessErrorRef.current) {
      setError(accessErrorRef.current);
      setAccessError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await setPersistence(auth, browserSessionPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const email  = result.user.email;

      // Guard shift check — must happen right after sign-in
      const guardData = await getGuardByEmail(email);
      if (guardData) {
        const onShift = isGuardOnShift(guardData.shiftStart, guardData.shiftEnd);
        if (!onShift) {
          await auth.signOut();
          navigate("/off-shift", { replace: true });
          return;
        }
      }
      // Navigation handled by useEffect above once AuthContext settles

    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site.");
      } else {
        setError("Sign-in failed. Please try again.");
        console.error(err);
      }
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm p-10 shadow-sm">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight text-black leading-none">
            Digital Renter Logbook
          </h1>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-1.5">
            Access Control Management
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 uppercase tracking-wider mb-5 border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </p>
        )}

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 disabled:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-semibold py-3 transition-colors duration-150"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
          )}
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>

        <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center mt-4">
          Only registered accounts have access
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end mt-6">
          <span className="text-xs text-gray-300 tracking-wider">v1.1.0</span>
        </div>
      </div>
    </div>
  );
}