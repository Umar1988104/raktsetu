import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, PlusCircle, ClipboardList, Users, Bell, UserRound, LogOut, Droplet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();
  const role = profile?.user?.role;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const initials = (profile?.user?.name || firebaseUser?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="mark">
            <Droplet size={16} fill="currentColor" />
          </span>
          RaktSetu
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>

          {role === "seeker" && (
            <>
              <NavLink to="/requests/new" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <PlusCircle size={18} /> New Request
              </NavLink>
              <NavLink to="/requests" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <ClipboardList size={18} /> My Requests
              </NavLink>
              <NavLink to="/donors" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <Users size={18} /> Donor Network
              </NavLink>
            </>
          )}

          <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Bell size={18} /> Notifications
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <UserRound size={18} /> Profile
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn">
            <Bell size={18} />
            <span className="dot" />
          </button>
          <div className="avatar">{initials}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
