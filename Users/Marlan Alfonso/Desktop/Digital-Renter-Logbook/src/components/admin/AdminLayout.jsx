// src/components/admin/AdminLayout.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",        path: "/admin" },
  { label: "Log History",      path: "/admin/logs" },
  { label: "Residents",        path: "/admin/residents" },
  { label: "Guards",           path: "/admin/guards" },
  { label: "Visitor Requests", path: "/admin/visitors" },
  { label: "Blacklist",        path: "/admin/blacklist" },
  { label: "Reports",          path: "/admin/reports" },
];

export default function AdminLayout({ children }) {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Derive initials from name for avatar
  const initials = userData?.name
    ? userData.name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex">
      <aside className="w-44 min-h-screen bg-[#EFEFEA] border-r border-gray-200 flex flex-col py-8 px-5 fixed top-0 left-0 z-30">

        {/* ── Brand ── */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-gray-900">Access Control</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">Admin Panel</p>
        </div>

        <div className="border-t border-gray-300 mb-6" />

        {/* ── Nav ── */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `text-xs font-semibold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ── Profile + Sign Out ── */}
        <div className="mt-auto pt-5 border-t border-gray-200 space-y-3">
          {/* Avatar + name */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-800 truncate leading-tight">
                {userData?.name ?? "Admin"}
              </p>
              <p className="text-[9px] text-gray-400 truncate leading-tight">
                {userData?.email ?? ""}
              </p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="ml-44 flex-1 min-h-screen">{children}</main>
    </div>
  );
}