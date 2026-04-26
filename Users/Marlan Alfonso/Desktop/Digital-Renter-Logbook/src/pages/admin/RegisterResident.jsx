// src/pages/admin/RegisterResident.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerResident } from "../../firebase/residents";
import { useAuth } from "../../hooks/useAuth";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ className, ...props }) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-black focus:bg-white transition-colors ${className ?? ""}`}
    />
  );
}

export default function RegisterResident() {
  const navigate     = useNavigate();
  const { userName } = useAuth();

  const [form, setForm] = useState({
    name: "", email: "", unit: "", moveInDate: "", emergencyContact: "",
  });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(null);
  const [pinRevealed, setPinRevealed] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim())  { setError("Full name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!form.unit.trim())  { setError("Apartment unit is required."); return; }

    setLoading(true);
    try {
      const { residentId, pin } = await registerResident({
        name:             form.name.trim(),
        email:            form.email.trim(),
        unit:             form.unit.trim(),
        moveInDate:       form.moveInDate,
        emergencyContact: form.emergencyContact,
      });
      setSuccess({ residentId, pin });
      setPinRevealed(false);
    } catch (err) {
      console.error(err);
      if (err.code === "already-exists" || err.message?.includes("already exists")) {
        setError("A resident with this email is already registered.");
      } else {
        setError("Registration failed: " + (err.message ?? "Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(null);
    setPinRevealed(false);
    setForm({ name: "", email: "", unit: "", moveInDate: "", emergencyContact: "" });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="p-10 min-h-screen bg-[#F5F5F0] flex flex-col justify-center items-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-sm w-full shadow-sm text-center">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-black text-xl">✓</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Registration Complete</p>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Resident Created</h2>
          <p className="text-xs text-gray-400 mb-6">
            The resident can now sign in using their Google account linked to the registered email.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Assigned Resident ID</p>
            <p className="text-xl font-black tracking-tighter font-mono">{success.residentId}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8">
            <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">
              Access PIN — Show to resident now
            </p>
            <div className="flex items-center justify-center gap-3 mt-1">
              <p className="text-2xl font-black tracking-widest font-mono text-amber-800">
                {pinRevealed ? success.pin : "••••••"}
              </p>
              <button
                onClick={() => setPinRevealed((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-widest text-amber-600 border border-amber-300 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
              >
                {pinRevealed ? "Hide" : "Reveal"}
              </button>
            </div>
            <p className="text-[10px] text-amber-500 mt-2">
              This PIN will not be shown again. Give it to the resident now.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={resetForm} className="w-full bg-black text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-lg">
              Register Another
            </button>
            <button onClick={() => navigate("/admin/residents")} className="w-full border border-gray-200 py-3 text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-colors rounded-lg">
              View All Residents
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 min-h-screen bg-[#F5F5F0]">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <button onClick={() => navigate("/admin/residents")} className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-700 mb-4 block transition-colors">
            ← Back to Residents
          </button>
          <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Register Resident</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Registered by: {userName ?? "Admin"}</p>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 mb-6 rounded-lg">
            <p className="text-xs text-red-600 uppercase tracking-wider font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 space-y-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100 pb-3">
            Personal Information
          </p>

          <Field label="Full Name">
            <Input type="text" required value={form.name} onChange={set("name")} placeholder="e.g. Juan dela Cruz" />
          </Field>

          <Field label="Google Email Address" hint="Must match the resident's Google account exactly.">
            <Input type="email" required value={form.email} onChange={set("email")} placeholder="resident@gmail.com" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Apartment Unit" hint={`ID preview: ${new Date().getFullYear()}-${form.unit.toUpperCase() || "UNIT"}-XXXX`}>
              <Input type="text" required value={form.unit} onChange={set("unit")} placeholder="e.g. 301A" className="uppercase" />
            </Field>
            <Field label="Move-In Date">
              <Input type="date" value={form.moveInDate} onChange={set("moveInDate")} />
            </Field>
          </div>

          <Field label="Emergency Contact">
            <Input type="text" value={form.emergencyContact} onChange={set("emergencyContact")} placeholder="Name & number (optional)" />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-400 transition-colors rounded-lg"
          >
            {loading ? "Registering..." : "Register Resident"}
          </button>
        </form>
      </div>
    </div>
  );
}