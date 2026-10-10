import { useState } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { api } from "../api";

// People are going to broadcast an emergency to a family WhatsApp group
// whatever we do — so instead of fighting that, this makes the broadcast
// useful: the shared link opens a live, read-only status page (no phone
// numbers or donor details), so everyone sees the same current status.
export default function ShareRequestButton({ request }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function getLink() {
    const { token } = await api.post(`/api/requests/${request._id}/share`, {});
    return `${window.location.origin}/track/${token}`;
  }

  async function shareWhatsApp() {
    setBusy(true);
    setError("");
    try {
      const url = await getLink();
      const text = `Urgent: ${request.bloodGroup} blood needed (${request.units} unit${request.units > 1 ? "s" : ""}) at ${request.hospital}, ${request.area}. Live status: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    setBusy(true);
    setError("");
    try {
      const url = await getLink();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err.message || "Couldn't copy the link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className="secondary" onClick={shareWhatsApp} disabled={busy}>
        <Share2 size={14} /> Share on WhatsApp
      </button>
      <button type="button" className="ghost" onClick={copyLink} disabled={busy}>
        {copied ? <Check size={14} /> : <LinkIcon size={14} />} {copied ? "Copied" : "Copy link"}
      </button>
      {error && <span className="error" style={{ margin: 0 }}>{error}</span>}
    </div>
  );
}
