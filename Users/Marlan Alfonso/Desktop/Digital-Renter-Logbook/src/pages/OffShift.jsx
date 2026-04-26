// src/pages/OffShift.jsx
// Shown when a guard attempts to login outside their assigned shift window.
import { useNavigate } from "react-router-dom";

export default function OffShift() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm p-10 shadow-sm">

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 border border-gray-200 px-3 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
            Access Denied
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black uppercase tracking-tight text-black leading-none mb-2">
          Off Shift
        </h1>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-8">
          Digital Renter Logbook
        </p>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-8" />

        {/* Message */}
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          You are attempting to log in outside your assigned shift window.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-8">
          Access is restricted to your designated shift hours only. Please contact your administrator if you believe this is an error.
        </p>

        {/* Shift info note */}
        <div className="bg-gray-50 border border-gray-100 px-4 py-3 mb-8">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Note</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            If your shift has been updated, please ask your admin to verify the schedule in the system.
          </p>
        </div>

        {/* Back to Login */}
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="w-full bg-black hover:bg-gray-800 text-white text-xs font-semibold
                     uppercase tracking-widest py-3.5 transition-colors duration-150"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}