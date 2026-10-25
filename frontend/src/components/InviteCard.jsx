import { useEffect, useState } from "react";
import { Check, Link as LinkIcon, Share2 } from "lucide-react";
import { api } from "../api";
import { useToast } from "./UiFeedback";
import { buildInviteLink } from "../utils/referralLink";

// "Invite friends" (v2.1): the donor's own sign-up link plus two plain counts.
// Never shows who was invited. Each invited friend who donates adds +10 trust
// points to the inviter, up to +20 (see utils/referral.js on the server).
export default function InviteCard() {
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get("/api/auth/me/referral")
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return null; // not available for this account — just stay out of the way
  if (!info) return null;

  const link = buildInviteLink(info.code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy — select the link and copy it by hand", "error");
    }
  }

  async function share() {
    const text = "Join me on RaktSetu — a free way to donate blood and help families find donors fast:";
    if (navigator.share) {
      try {
        await navigator.share({ title: "RaktSetu", text, url: link });
        return;
      } catch {
        /* cancelled: fall through to nothing */
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
  }

  return (
    <div className="card invite-card">
      <h3>Invite friends to donate</h3>
      <p className="invite-sub">
        Share your link. When a friend you invite makes their first recorded donation, your trust score goes up by 10 points (up to 20).
      </p>
      <div className="invite-link">
        <label htmlFor="invite-link-input" className="sr-only">Your invite link</label>
        <input id="invite-link-input" readOnly value={link} onFocus={(e) => e.target.select()} />
      </div>
      <div className="invite-actions">
        <button type="button" onClick={share}>
          <Share2 size={16} aria-hidden="true" /> Share
        </button>
        <button type="button" className="ghost" onClick={copy}>
          {copied ? <Check size={16} aria-hidden="true" /> : <LinkIcon size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <dl className="invite-counts">
        <div><dt>Signed up</dt><dd>{info.signedUp}</dd></div>
        <div><dt>Donated</dt><dd>{info.donated}</dd></div>
      </dl>
    </div>
  );
}
