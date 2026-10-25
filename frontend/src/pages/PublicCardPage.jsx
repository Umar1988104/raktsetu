import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { BrandLink, BridgeLoader } from "../components/Brand";
import { TIER_LABEL } from "../components/card/cardUtils";

// What the QR code opens. Anyone can see it, so it only ever shows what the
// card's owner allowed (the server decides — this page just displays it).
export default function PublicCardPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    // Keep these pages out of search engines.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    api
      .get(`/api/cards/public/${encodeURIComponent(id)}`)
      .then((d) => (d.card ? setState({ card: d.card }) : setState({ error: "Card not found", status: 404 })))
      .catch((err) => setState({ error: err.message, status: err.status }));
  }, [id]);

  const { card, error, status, loading } = state;

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-brand" style={{ justifyContent: "center" }}>
          <BrandLink className="auth-brand-link" />
        </div>

        {loading && <BridgeLoader />}

        {error && (
          <>
            <ShieldAlert size={40} className="empty-icon" />
            <h2>{status === 429 ? "Please wait a moment" : "Card not available"}</h2>
            <p className="status">
              {status === 429
                ? error
                : "This card couldn't be found. It may have been hidden or replaced by its owner, or the ID may be mistyped."}
            </p>
          </>
        )}

        {card && card.kind === "partner" && (
          <>
            {card.verifiedPartner ? <ShieldCheck size={44} style={{ color: "var(--green)" }} /> : <ShieldAlert size={44} style={{ color: "var(--orange)" }} />}
            <h2 style={{ marginTop: 8 }}>{card.hospitalName}</h2>
            <span className={`pill ${card.verifiedPartner ? "pill-confirmed" : "pill-searching"}`}>
              {card.verifiedPartner ? "Verified RaktSetu partner" : "Not verified by RaktSetu"}
            </span>
            {!card.verifiedPartner && (
              <p className="status" style={{ marginTop: 16 }}>
                This hospital signed up on RaktSetu but hasn't been checked by an admin. Confirm directly with the hospital before relying on it.
              </p>
            )}
          </>
        )}

        {card && card.kind === "member" && (
          <>
            {card.bloodGroup ? <div className="public-group">{card.bloodGroup}</div> : null}
            {card.name && <h2>{card.name}</h2>}
            <div className="preview-chips" style={{ justifyContent: "center", marginTop: 8 }}>
              {card.tier && <span className="pill pill-verified">{TIER_LABEL[card.tier] || card.tier}</span>}
              {card.verified !== undefined && (
                <span className={`pill ${card.verified ? "pill-confirmed" : "pill-expired"}`}>
                  {card.verified ? <><BadgeCheck size={13} style={{ marginRight: 4 }} />Verified by a hospital partner</> : "Not yet hospital-verified"}
                </span>
              )}
              {card.memberSinceYear && <span className="pill pill-expired">Member since {card.memberSinceYear}</span>}
              {card.referralsDonated > 0 && <span className="pill pill-expired">Invited {card.referralsDonated} donor{card.referralsDonated > 1 ? "s" : ""} who donated</span>}
              {card.eligibleToday !== undefined && (
                <span className={`pill ${card.eligibleToday ? "pill-available" : "pill-unavailable"}`}>
                  {card.eligibleToday ? "Eligible to donate today" : "Not eligible today"}
                </span>
              )}
            </div>
            {Object.keys(card).length === 1 && <p className="status">This member chose to share nothing else.</p>}
          </>
        )}

        <p className="status" style={{ marginTop: 24, fontSize: "0.78rem" }}>
          RaktSetu member card — not a government ID or medical record. Always confirm blood group with a blood bank test.
        </p>
        <Link to="/" style={{ fontSize: "0.85rem", fontWeight: 600 }}>What is RaktSetu?</Link>
      </div>
    </div>
  );
}
