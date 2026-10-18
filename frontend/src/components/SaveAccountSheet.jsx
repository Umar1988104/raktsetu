import { useState, useId } from "react";
import Sheet from "./Sheet";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./UiFeedback";

const FRIENDLY = {
  "auth/email-already-in-use": "That email already has a RaktSetu account. Use a different email here, or log in with that one.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/weak-password": "Please choose a password with at least 6 characters.",
  "auth/credential-already-in-use": "That email already has a RaktSetu account. Use a different email here.",
  "auth/requires-recent-login": "For safety, please log out and start a new guest session before saving.",
};

// Turns a guest session into a full account (same requests, same history).
export default function SaveAccountSheet({ open, onClose }) {
  const { upgradeGuest } = useAuth();
  const toast = useToast();
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await upgradeGuest(email.trim(), password);
      toast("Account saved. We sent you a verification email.", "success");
      setPassword("");
      onClose();
    } catch (err) {
      setError(FRIENDLY[err.code] || err.message || "Couldn't save your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} labelledBy={`${uid}-t`}>
      <h3 id={`${uid}-t`}>Save your account</h3>
      <p className="sheet-sub">Your requests and history stay exactly as they are. Next time, log in with this email and password.</p>
      <form onSubmit={submit} style={{ marginTop: 8 }}>
        <label htmlFor={`${uid}-e`}>Email</label>
        <input id={`${uid}-e`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor={`${uid}-p`}>Password (6+ characters)</label>
        <input id={`${uid}-p`} type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save account"}</button>
        <button type="button" className="ghost" onClick={onClose}>Not now</button>
      </form>
    </Sheet>
  );
}
