import { lazy, Suspense } from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import LanguageToggle from "./LanguageToggle";
import AppearanceButton from "./AppearanceSheet";
import { BrandLockup, BridgeLoader } from "./Brand";
import { PageTransition } from "../motion/kit";

// Shares its chunk with the router's own lazy import of the same file.
const DashboardLayout = lazy(() => import("../layouts/DashboardLayout"));

// For pages anyone can open (camps, impact): logged-in people get the normal
// app shell with the sidebar; visitors get a simple public header instead.
export default function MaybeLayout() {
  const { firebaseUser, profile, loading } = useAuth();
  const { t } = useLang();

  if (loading) return <BridgeLoader fullscreen />;
  if (firebaseUser && profile) {
    return (
      <Suspense fallback={<BridgeLoader fullscreen />}>
        <DashboardLayout />
      </Suspense>
    );
  }

  return (
    <div>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-brand" style={{ padding: 0 }}>
          <BrandLockup />
        </Link>
        <div className="nav-links">
          <div className="hide-mobile">
            <LanguageToggle />
          </div>
          <AppearanceButton />
          <Link to="/login" className="btn-outline">
            {t("Log in")}
          </Link>
          <Link to="/signup" className="btn-primary">
            {t("Get started")}
          </Link>
        </div>
      </nav>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px 56px" }}>
        <Suspense fallback={<BridgeLoader />}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>
    </div>
  );
}
