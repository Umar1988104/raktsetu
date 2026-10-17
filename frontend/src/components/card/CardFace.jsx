import { BadgeCheck, Droplet } from "lucide-react";
import { BridgeMark } from "../Brand";
import { TIER_LABEL, memberSinceLabel, shortDate, STAMP_SLOTS } from "./cardUtils";

// The two faces of a RaktSetu card. Sizes use container units (cqw) so the
// card scales cleanly in the stack, the page and the downloaded image.
// Card colours are fixed (not theme-dependent): a card looks like a card.
const DISCLAIMER = "RaktSetu member card — not a government ID or medical record.";

export function CardFront({ card, qr }) {
  const partner = card.kind === "partner";
  return (
    <div className="rs-front">
      <div className="rs-top">
        <span className="rs-brand">
          <BridgeMark size={22} /> RaktSetu
        </span>
        {partner ? (
          <span className={`rs-badge ${card.partnerVerified ? "" : "pending"}`}>
            {card.partnerVerified ? <BadgeCheck size={13} /> : null}
            {card.partnerVerified ? "Verified Partner" : "Pending verification"}
          </span>
        ) : (
          <span className="rs-badge">{TIER_LABEL[card.tier] || card.tier}</span>
        )}
      </div>

      <div className="rs-mid">
        {partner ? (
          <div className="rs-hospital">{card.hospitalName}</div>
        ) : (
          <>
            <div className="rs-who">
              {card.photo ? <img className="rs-photo" src={card.photo} alt="" /> : <span className="rs-photo rs-initial">{(card.shortName || "?")[0]}</span>}
              <div className="rs-name">
                {card.shortName}
                {card.verified && <BadgeCheck size={16} aria-label="Verified" />}
                {card.relation && <small>{card.relation}</small>}
              </div>
            </div>
            <div className="rs-group" aria-label={card.bloodGroup ? `Blood group ${card.bloodGroup}` : "Blood group not set"}>
              {card.bloodGroup || <Droplet size={36} />}
            </div>
          </>
        )}
      </div>

      <div className="rs-bottom">
        <div>
          <div className="rs-id">{card.cardId}</div>
          <div className="rs-since">{partner ? "Hospital partner" : `Member since ${memberSinceLabel(card.memberSince)}`}</div>
        </div>
        {qr && <img className="rs-qr" src={qr} alt={`QR code that opens the verify page for card ${card.cardId}`} />}
      </div>
    </div>
  );
}

export function CardBack({ card }) {
  const partner = card.kind === "partner";
  const stamps = card.stamps || [];
  const ec = card.emergencyContact;
  return (
    <div className="rs-back">
      <div className="rs-stripe" />
      {partner ? (
        <p className="rs-note" style={{ marginTop: "6cqw" }}>
          Families can scan the QR code on the front to confirm this hospital is a RaktSetu partner.
        </p>
      ) : (
        <>
          <div className="rs-stamps" aria-label={`${stamps.length} recorded donations`}>
            {Array.from({ length: STAMP_SLOTS }).map((_, i) => {
              const s = stamps[i];
              return (
                <span key={i} className={`rs-stamp ${s ? "filled" : ""}`} title={s ? shortDate(s.date) : "Empty stamp"}>
                  {s ? <Droplet size={14} /> : null}
                </span>
              );
            })}
          </div>
          <div className="rs-line">
            {card.hasDonorProfile
              ? card.nextEligibleDate
                ? `Next eligible: ${shortDate(card.nextEligibleDate)}`
                : "Eligible to donate now"
              : "No donor profile yet"}
            {stamps.length > STAMP_SLOTS ? ` · +${stamps.length - STAMP_SLOTS} more donations` : ""}
          </div>
          {ec?.enabled && ec.name && ec.phone && (
            <div className="rs-line">
              Emergency: {ec.name} · {ec.phone}
            </div>
          )}
        </>
      )}
      <p className="rs-disclaimer">{DISCLAIMER}</p>
    </div>
  );
}
