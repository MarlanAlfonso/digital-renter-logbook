// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";

// Pages
import Login from "./pages/Login";
import OffShift from "./pages/OffShift";
import AdminDashboard from "./pages/admin/AdminDashboard";
import GuardDashboard from "./pages/guard/GuardDashboard";       // ← fixed path
import ResidentDashboard from "./pages/resident/ResidentDashboard"; // ← fixed path
import ResidentManagement from "./pages/admin/ResidentManagement";
import RegisterResident from "./pages/admin/RegisterResident";
import LogHistory from "./pages/admin/LogHistory";
import VisitorRequests from "./pages/admin/VisitorRequests";
import GuardManagement from "./pages/admin/GuardManagement";
import Blacklist from "./pages/admin/Blacklist";

function ComingSoon({ title, subtitle = "Admin Panel" }) {
  return (
    <div className="p-10 min-h-screen bg-[#F5F5F0] flex flex-col justify-center items-center text-center font-mono">
      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-2">{subtitle}</p>
      <h1 className="text-5xl font-black uppercase tracking-tighter text-gray-900 italic underline decoration-8 underline-offset-8">
        {title}
      </h1>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 border-2 border-gray-200 px-4 py-1">
        Module Under Construction
      </p>
    </div>
  );
}

function AdminRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function RoleBasedRedirect() {
  const { user, userRole, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (userRole) {
    case "admin":    return <Navigate to="/admin" replace />;
    case "guard":    return <Navigate to="/guard" replace />;
    case "resident": return <Navigate to="/resident" replace />;
    default:         return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* PUBLIC */}
          <Route path="/"          element={<RoleBasedRedirect />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/off-shift" element={<OffShift />} />

          {/* ADMIN */}
          <Route path="/admin"                    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/residents"          element={<AdminRoute><ResidentManagement /></AdminRoute>} />
          <Route path="/admin/residents/register" element={<AdminRoute><RegisterResident /></AdminRoute>} />
          <Route path="/admin/visitors" element={<AdminRoute><VisitorRequests /></AdminRoute>} />
          <Route path="/admin/logs" element={<AdminRoute><LogHistory /></AdminRoute>} />
          <Route path="/admin/guards" element={<AdminRoute><GuardManagement /></AdminRoute>} />
          <Route path="/admin/blacklist" element={<AdminRoute><Blacklist /></AdminRoute>} />
          <Route path="/admin/reports"            element={<AdminRoute><ComingSoon title="Reports" /></AdminRoute>} />

          {/* GUARD */}
          <Route
            path="/guard"
            element={
              <ProtectedRoute allowedRoles={["guard"]}>
                <GuardDashboard />
              </ProtectedRoute>
            }
          />

          {/* RESIDENT */}
          <Route
            path="/resident"
            element={
              <ProtectedRoute allowedRoles={["resident"]}>
                <ResidentDashboard />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}