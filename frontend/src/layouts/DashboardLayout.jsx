import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, PlusCircle, ClipboardList, Users, Bell, UserRound, LogOut, Droplet, ShieldCheck, Menu, X, Siren, Tent, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import LanguageToggle from "../components/LanguageToggle";
import { useConfirm, useToast } from "../components/UiFeedback";

export default function DashboardLayout() {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = profile?.user?.role;
  const { t } = useLang();
  const confirm = useConfirm();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile sidebar automatically whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  async function handleLogout() {
    // Guests (anonymous sessions) have no password or email to sign back in
    // with — logging out genuinely means losing access to their requests, so
    // that case gets a much stronger warning.
    const isGuest = profile?.user?.isGuest;
    const ok = await confirm({
      title: t("Log out of RaktSetu?"),
      message: isGuest
        ? t("You're using a guest session. If you log out, you won't be able to get back to your requests.")
        : t("You'll need to sign in again to see your dashboard."),
      confirmLabel: t("Log out"),
      cancelLabel: t("Stay signed in"),
    });
    if (!ok) return;

    await logout();
    toast(t("You've been logged out."), "success");
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
            <LayoutDashboard size={18} /> {t("Dashboard")}
          </NavLink>

          {role === "seeker" && (
            <>
              <NavLink
                to="/requests/new?sos=1"
                className="sidebar-link"
                style={{ background: "var(--primary)", color: "#fff", fontWeight: 700, marginBottom: 4 }}
              >
                <Siren size={18} /> {t("SOS — Request Now")}
              </NavLink>
              <NavLink to="/requests/new" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <PlusCircle size={18} /> {t("New Request")}
              </NavLink>
              <NavLink to="/requests" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <ClipboardList size={18} /> {t("My Requests")}
              </NavLink>
              <NavLink to="/donors" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                <Users size={18} /> {t("Donor Network")}
              </NavLink>
            </>
          )}

          {role === "hospital" && (
            <NavLink to="/verify" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <ShieldCheck size={18} /> {t("Verify Requests")}
            </NavLink>
          )}

          <NavLink to="/camps" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Tent size={18} /> {t("Donation Camps")}
          </NavLink>
          <NavLink to="/updates" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Sparkles size={18} /> {t("What's new")}
          </NavLink>

          {role !== "hospital" && (
            <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <Bell size={18} /> {t("Notifications")}
            </NavLink>
          )}
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <UserRound size={18} /> {t("Profile")}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogout}>
            <LogOut size={16} /> {t("Log out")}
          </button>
          <Link
            to="/privacy"
            style={{ display: "block", textAlign: "center", fontSize: "0.78rem", marginTop: 10, color: "var(--text-soft)" }}
          >
            {t("Privacy Policy")}
          </Link>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ flex: 1 }} />
          <LanguageToggle />
          <div className="avatar">{initials}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
