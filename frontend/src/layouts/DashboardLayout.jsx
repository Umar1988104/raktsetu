import { useState, useEffect, useRef, Suspense } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import * as m from "motion/react-m";
import { LayoutDashboard, PlusCircle, ClipboardList, Users, Bell, UserRound, LogOut, ShieldCheck, Menu, X, Siren, Tent, Sparkles, BarChart3, ShieldAlert, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import LanguageToggle from "../components/LanguageToggle";
import AppearanceButton from "../components/AppearanceSheet";
import { BrandLockup, BridgeLoader } from "../components/Brand";
import { useConfirm, useToast } from "../components/UiFeedback";
import { PageTransition } from "../motion/kit";
import AccountBanners from "../components/AccountBanners";
import { SPRING_SNAPPY } from "../motion/springs";

// One sidebar link. The highlight is a shared element: it slides from the old
// active link to the new one instead of just switching.
function NavItem({ to, icon, children }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
      {({ isActive }) => (
        <>
          {isActive && <m.span layoutId="nav-indicator" className="nav-indicator" transition={SPRING_SNAPPY} />}
          {icon}
          <span className="nav-label">{children}</span>
        </>
      )}
    </NavLink>
  );
}

// iOS-style large titles: each page's big heading collapses into a small
// centred title in the top bar once it scrolls out of view.
function useCollapsingTitle(mainRef, topbarRef, pathname) {
  const [title, setTitle] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof IntersectionObserver === "undefined") return;
    let io = null;
    let current = null;
    let raf = 0;

    function attach() {
      const h1 = main.querySelector(".page-header h1");
      if (h1 === current) {
        if (h1 && h1.textContent !== title) setTitle(h1.textContent || "");
        return;
      }
      io?.disconnect();
      current = h1;
      if (!h1) {
        setTitle("");
        setCollapsed(false);
        return;
      }
      setTitle(h1.textContent || "");
      const barHeight = topbarRef.current?.offsetHeight || 64;
      io = new IntersectionObserver(
        ([entry]) => setCollapsed(!entry.isIntersecting && entry.boundingClientRect.bottom < barHeight),
        { rootMargin: `-${barHeight}px 0px 0px 0px`, threshold: 0 }
      );
      io.observe(h1);
    }

    attach();
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(attach);
    });
    mo.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io?.disconnect();
      setCollapsed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return { title, collapsed };
}

export default function DashboardLayout() {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = profile?.user?.role;
  const { t } = useLang();
  const confirm = useConfirm();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef(null);
  const topbarRef = useRef(null);
  const { title, collapsed } = useCollapsingTitle(mainRef, topbarRef, location.pathname);

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
      tone: isGuest ? "danger" : "default",
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
      <div className={`scrim ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label={t("Main navigation")}>
        <div className="sidebar-brand">
          <BrandLockup />
        </div>

        <nav className="sidebar-nav">
          <NavItem to="/dashboard" icon={<LayoutDashboard size={18} />}>
            {t("Dashboard")}
          </NavItem>

          {role === "seeker" && (
            <>
              <NavLink to="/requests/new?sos=1" className="sidebar-link sos">
                <Siren size={18} /> <span className="nav-label">{t("SOS — Request Now")}</span>
              </NavLink>
              <NavItem to="/requests/new" icon={<PlusCircle size={18} />}>
                {t("New Request")}
              </NavItem>
              <NavItem to="/requests" icon={<ClipboardList size={18} />}>
                {t("My Requests")}
              </NavItem>
              <NavItem to="/donors" icon={<Users size={18} />}>
                {t("Donor Network")}
              </NavItem>
            </>
          )}

          {role === "hospital" && (
            <NavItem to="/verify" icon={<ShieldCheck size={18} />}>
              {t("Verify Requests")}
            </NavItem>
          )}

          <NavItem to="/camps" icon={<Tent size={18} />}>
            {t("Donation Camps")}
          </NavItem>
          <NavItem to="/updates" icon={<Sparkles size={18} />}>
            {t("What's new")}
          </NavItem>
          <NavItem to="/impact" icon={<BarChart3 size={18} />}>
            {t("Impact")}
          </NavItem>
          {profile?.isAdmin && (
            <NavItem to="/admin" icon={<ShieldAlert size={18} />}>
              {t("Admin")}
            </NavItem>
          )}

          {role !== "hospital" && (
            <NavItem to="/notifications" icon={<Bell size={18} />}>
              {t("Notifications")}
            </NavItem>
          )}
          {!profile?.user?.isGuest && (
            <NavItem to="/card" icon={<CreditCard size={18} />}>
              {t("My Card")}
            </NavItem>
          )}
          <NavItem to="/profile" icon={<UserRound size={18} />}>
            {t("Profile")}
          </NavItem>
        </nav>

        <div className="sidebar-footer">
          <button className="ghost" style={{ width: "100%" }} onClick={handleLogout}>
            <LogOut size={16} /> {t("Log out")}
          </button>
          <Link to="/privacy" className="privacy-link">
            {t("Privacy Policy")}
          </Link>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar" ref={topbarRef}>
          <button
            className="icon-btn mobile-menu-btn"
            aria-label={mobileOpen ? t("Close menu") : t("Open menu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className={`topbar-title ${collapsed ? "show" : ""}`} aria-hidden="true">
            {title}
          </div>
          <div style={{ flex: 1 }} />
          <div className="hide-mobile">
            <LanguageToggle />
          </div>
          <AppearanceButton />
          <div className="avatar" aria-hidden="true">
            {initials}
          </div>
        </header>
        <main className="content" ref={mainRef}>
          <AccountBanners />
          <Suspense fallback={<BridgeLoader />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
