import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, PlusCircle, ClipboardList, Users, Bell, UserRound, LogOut, Droplet, ShieldCheck, Menu, X, Siren, Tent } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = profile?.user?.role;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile sidebar automatically whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

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
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
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
              <NavLink
                to="/requests/new?sos=1"
                className="sidebar-link"
                style={{ background: "var(--primary)", color: "#fff", fontWeight: 700, marginBottom: 4 }}
              >
                <Siren size={18} /> SOS — Request Now
              </NavLink>
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

          {role === "hospital" && (
            <NavLink to="/verify" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <ShieldCheck size={18} /> Verify Requests
            </NavLink>
          )}

          <NavLink to="/camps" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Tent size={18} /> Donation Camps
          </NavLink>

          {role !== "hospital" && (
            <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <Bell size={18} /> Notifications
            </NavLink>
          )}
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <UserRound size={18} /> Profile
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
          <Link
            to="/privacy"
            style={{ display: "block", textAlign: "center", fontSize: "0.78rem", marginTop: 10, color: "var(--text-soft)" }}
          >
            Privacy Policy
          </Link>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ flex: 1 }} />
          <div className="avatar">{initials}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
