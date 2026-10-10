import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import LanguageToggle from "../components/LanguageToggle";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
          <h2 style={{ margin: 0 }}>{t("Create your RaktSetu account")}</h2>
          <LanguageToggle />
        </div>
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
        <p style={{ marginTop: 14, fontSize: "0.88rem" }}>
          {t("Already have an account?")} <Link to="/login">{t("Log in")}</Link>
        </p>
      </div>
    </div>
  );
}
