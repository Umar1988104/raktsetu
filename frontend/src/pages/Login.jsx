import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import LanguageToggle from "../components/LanguageToggle";

export default function Login() {
  const { login } = useAuth();
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
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>{t("Log in")}</h2>
          <LanguageToggle />
        </div>
        <form onSubmit={handleSubmit}>
          <label>{t("Email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>{t("Password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? t("Logging in...") : t("Log in")}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: "0.88rem" }}>
          {t("Need an account?")} <Link to="/signup">{t("Sign up")}</Link>
        </p>
      </div>
    </div>
  );
}
