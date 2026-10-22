import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const KEY = "raktsetu_checklist_hidden";
const isHidden = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

// First-run checklist (v2.0). Only real, checkable things from the account —
// several of them also raise the donor's trust badge. Hidden once complete,
// or when the person dismisses it.
export function checklistItems({ user, donors, emailVerified }) {
  if (!user) return [];
  const items = [];
  if (user.isGuest) items.push({ id: "save", label: "Save your account with an email", done: false, to: null, hint: "Use the banner at the top" });
  else items.push({ id: "email", label: "Verify your email", done: !!emailVerified, to: null, hint: "Use the banner at the top" });
  items.push({ id: "photo", label: "Add a profile photo", done: !!user.photo, to: "/profile", hint: user.role === "donor" ? "+10 trust" : "" });
  items.push({ id: "address", label: "Add your address", done: !!user.address, to: "/profile", hint: user.role === "donor" ? "+10 trust" : "" });
  items.push({ id: "alt", label: "Add an alternate phone number", done: !!user.alternatePhone, to: "/profile", hint: user.role === "donor" ? "+10 trust" : "" });
  if (user.role === "donor") {
    const list = donors || [];
    items.push({ id: "donor", label: "Create your donor profile", done: list.length > 0, to: "/profile" });
    items.push({ id: "available", label: "Switch “Available to donate” on", done: list.some((d) => d.available), to: "/profile" });
    items.push({ id: "verified", label: "Get verified by a hospital partner", done: list.some((d) => d.verified), to: null, hint: "+40 trust — ask a partner hospital" });
  }
  if (user.role === "seeker" && !user.isGuest) {
    items.push({ id: "family", label: "Add a family member (optional)", done: (user.familyMembers || []).length > 0, to: "/profile" });
  }
  return items;
}

function Ring({ done, total }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg className="progress-ring" viewBox="0 0 60 60" role="img" aria-label={`${done} of ${total} done`}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 30 30)" />
      <text x="30" y="35" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--text)">{done}/{total}</text>
    </svg>
  );
}

export default function OnboardingChecklist({ donors }) {
  const { profile, emailVerified } = useAuth();
  const [hidden, setHidden] = useState(isHidden);
  const user = profile?.user;
  if (!user || user.role === "hospital" || hidden) return null;
  if (user.role === "donor" && donors === null) return null; // wait for the donor profiles so nothing flickers

  const items = checklistItems({ user, donors, emailVerified });
  const done = items.filter((i) => i.done).length;
  if (items.length === 0 || done === items.length) return null;

  return (
    <div className="card checklist" aria-label="Getting started checklist">
      <div className="checklist-head">
        <Ring done={done} total={items.length} />
        <div>
          <h3>Finish setting up</h3>
          <p className="status" style={{ margin: 0 }}>A complete profile is easier to trust{user.role === "donor" ? " and raises your trust badge" : ""}.</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Hide this checklist" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* fine */ } setHidden(true); }}>
          <X size={16} />
        </button>
      </div>
      <ul className="checklist-items">
        {items.map((i) => (
          <li key={i.id} className={i.done ? "done" : ""}>
            <span className="check-dot" aria-hidden="true">{i.done && <Check size={12} />}</span>
            <span className="check-label">{i.label}{i.hint && !i.done ? <small> · {i.hint}</small> : null}</span>
            {!i.done && i.to && <Link to={i.to} className="btn-outline">Do it</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
