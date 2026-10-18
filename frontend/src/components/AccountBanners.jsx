import { useEffect, useState } from "react";
import { MailCheck, UserPlus, Hourglass } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./UiFeedback";
import SaveAccountSheet from "./SaveAccountSheet";

// Top-of-page notices about the account itself (v1.8). At most one per state:
//   guest         -> save your account
//   unverified    -> verify your email (needed to donate / accept / act as a hospital)
//   hospital      -> waiting for admin approval
export default function AccountBanners() {
  const { profile, emailVerified, sendVerification, refreshVerification } = useAuth();
  const toast = useToast();
  const [saveOpen, setSaveOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  const user = profile?.user;
  const needsVerify = !!user && !user.isGuest && !emailVerified;

  // When someone comes back from their email tab, check straight away.
  useEffect(() => {
    if (!needsVerify) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") refreshVerification().catch(() => {});
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [needsVerify]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!user) return null;

  async function resend() {
    try {
      await sendVerification();
      setCooldown(30);
      toast("Verification email sent. Check your inbox and spam folder.", "success");
    } catch (err) {
      toast(err.code === "auth/too-many-requests" ? "Too many tries — please wait a few minutes." : "Couldn't send the email. Try again shortly.", "error");
    }
  }

  async function check() {
    setChecking(true);
    try {
      const ok = await refreshVerification();
      toast(ok ? "Email verified — thank you!" : "Not verified yet. Open the link in the email first.", ok ? "success" : "info");
    } catch {
      toast("Couldn't check right now. Try again.", "error");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      {user.isGuest && (
        <div className="banner banner-info" role="region" aria-label="Save your account">
          <UserPlus size={20} />
          <div className="banner-text">
            <strong>You're using a guest session.</strong> Save your account with an email and password so you don't lose your requests when you log out.
          </div>
          <button type="button" onClick={() => setSaveOpen(true)}>Save account</button>
        </div>
      )}

      {needsVerify && (
        <div className="banner banner-warn" role="region" aria-label="Verify your email">
          <MailCheck size={20} />
          <div className="banner-text">
            <strong>Verify your email.</strong> It's needed to become a donor, accept requests or use hospital tools. We sent a link to {user.email || "your email"}.
          </div>
          <div className="banner-actions">
            <button type="button" className="ghost" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend email"}
            </button>
            <button type="button" onClick={check} disabled={checking}>I've verified</button>
          </div>
        </div>
      )}

      {user.role === "hospital" && !user.partnerVerified && (
        <div className="banner banner-warn" role="region" aria-label="Waiting for approval">
          <Hourglass size={20} />
          <div className="banner-text">
            <strong>Waiting for admin approval.</strong> Verification tools, card lookup and camps unlock once an admin has checked your hospital.
          </div>
        </div>
      )}

      <SaveAccountSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
    </>
  );
}
