import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import LanguageToggle from "../components/LanguageToggle";
import AppearanceButton from "../components/AppearanceSheet";
import { BrandLink } from "../components/Brand";
import { getPendingReferral } from "../utils/referralLink";

export default function Signup() {
  const { signup } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(email, password);
      navigate("/complete-profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandLink className="auth-brand-link" />
          <span style={{ flex: 1 }} />
          <AppearanceButton />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>{t("Create your RaktSetu account")}</h2>
          <LanguageToggle />
        </div>
        {getPendingReferral() && (
          <p className="invite-note" role="note">
            {t("A RaktSetu donor invited you. If you sign up as a donor, they get a thank-you when you make your first donation.")}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label>{t("Email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>{t("Password (min 6 characters)")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? t("Creating account...") : t("Sign up")}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: "0.88rem" }}>
          {t("Already have an account?")} <Link to="/login">{t("Log in")}</Link>
        </p>
      </div>
    </div>
  );
}
