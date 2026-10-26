import { useEffect, useId, useRef, useState } from "react";
import { Bell, ClipboardCheck, CreditCard, Droplet, HeartHandshake, Image as ImageIcon, MessageCircle, ShieldCheck, Siren, Sparkles, Tent, Users, Warehouse } from "lucide-react";
import Sheet from "./Sheet";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../i18n";
import { TOUR_VERSION, WELCOME, WHATS_NEW } from "../data/tour";
import { canRemember, chooseTour, getTourState, markSeen } from "../utils/tourState";

const ICONS = { Bell, ClipboardCheck, CreditCard, Droplet, HeartHandshake, Image: ImageIcon, MessageCircle, ShieldCheck, Siren, Sparkles, Tent, Users, Warehouse };

export const replayTour = () => window.dispatchEvent(new Event("rs-tour-replay"));

// Quick tour (v2.1d): new people get "Welcome" (what each feature does); people
// who return after a release get "What's new". Two buttons only: Skip and Next.
export default function WelcomeTour() {
  const { profile } = useAuth();
  const { t, lang } = useLang();
  const user = profile?.user;
  const userId = user?._id || user?.email || user?.name;
  const role = ["donor", "seeker", "hospital"].includes(user?.role) ? user.role : null;
  const [kind, setKind] = useState(null); // "welcome" | "whatsnew" | null
  const [step, setStep] = useState(0);
  const titleId = useId();
  const bodyId = useId();
  const nextRef = useRef(null);

  // Decide once the profile is known (a moment after the page has appeared).
  useEffect(() => {
    if (!user || !role || user.isGuest || !userId || !canRemember()) return undefined;
    const pick = chooseTour({ state: getTourState(userId), createdAt: user.createdAt, version: TOUR_VERSION });
    if (!pick) return undefined;
    const timer = setTimeout(() => {
      setStep(0);
      setKind(pick);
    }, 700);
    return () => clearTimeout(timer);
  }, [user, role, userId]);

  // "Show the tour again" (Profile page).
  useEffect(() => {
    const again = () => {
      setStep(0);
      setKind("welcome");
    };
    window.addEventListener("rs-tour-replay", again);
    return () => window.removeEventListener("rs-tour-replay", again);
  }, []);

  if (!kind || !role) return null;
  const steps = (kind === "welcome" ? WELCOME : WHATS_NEW)[role];
  const cur = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;
  const Icon = ICONS[cur.icon] || Sparkles;

  function finish() {
    if (userId) markSeen(userId, kind, TOUR_VERSION);
    setKind(null);
  }

  return (
    <Sheet open onClose={finish} labelledBy={titleId} describedBy={bodyId} initialFocusRef={nextRef} className="tour-sheet">
      <div className="tour-top">
        <span className="tour-chip">{kind === "welcome" ? t("Welcome") : t("What's new")}</span>
        <span className="tour-count" role="status">{t("Step")} {step + 1} / {steps.length}</span>
      </div>
      <div className="tour-body" key={step}>
        <div className="tour-icon" aria-hidden="true"><Icon size={30} /></div>
        <h2 id={titleId}>{cur.title[lang] || cur.title.en}</h2>
        <p id={bodyId}>{cur.body[lang] || cur.body.en}</p>
      </div>
      <div className="tour-dots" aria-hidden="true">
        {steps.map((_, i) => <i key={i} className={i === step ? "on" : i < step ? "done" : ""} />)}
      </div>
      <div className="tour-actions">
        <button type="button" className="ghost" onClick={finish}>{t("Skip")}</button>
        <button type="button" ref={nextRef} onClick={() => (last ? finish() : setStep(step + 1))}>{last ? t("Done") : t("Next")}</button>
      </div>
    </Sheet>
  );
}
