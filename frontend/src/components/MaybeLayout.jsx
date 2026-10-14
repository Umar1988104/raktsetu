import { Outlet, Link } from "react-router-dom";
import { Droplet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import DashboardLayout from "../layouts/DashboardLayout";
import LanguageToggle from "./LanguageToggle";

// For pages anyone can open (camps, impact): logged-in people get the normal
// app shell with the sidebar; visitors get a simple public header instead.
export default function MaybeLayout() {
  const { firebaseUser, profile, loading } = useAuth();
  const { t } = useLang();

  if (loading) return <p className="loading">Loading...</p>;
  if (firebaseUser && profile) return <DashboardLayout />;

  return (
    <div>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-brand" style={{ padding: 0 }}>
          <span className="mark">
            <Droplet size={16} fill="currentColor" />
          </span>
          RaktSetu
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <LanguageToggle />
          <Link to="/login">{t("Log in")}</Link>
          <Link to="/signup" className="btn-primary">
            {t("Get started")}
          </Link>
        </div>
      </nav>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 56px" }}>
        <Outlet />
      </main>
    </div>
  );
}
