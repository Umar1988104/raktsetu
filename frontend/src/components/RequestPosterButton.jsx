import { useCallback, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { api } from "../api";
import ShareImageSheet from "./ShareImageSheet";
import { drawRequestPoster } from "../utils/shareImage";

// "Make a poster" for a blood request (v2.1c): a picture for WhatsApp groups with
// a QR code to the live status page. No phone number and no patient name on it.
export default function RequestPosterButton({ request }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openSheet() {
    setBusy(true);
    setError("");
    try {
      const { token } = await api.post(`/api/requests/${request._id}/share`, {});
      setUrl(`${window.location.origin}/track/${token}`);
      setOpen(true);
    } catch (err) {
      setError(err.message || "Couldn't make the poster");
    } finally {
      setBusy(false);
    }
  }

  const draw = useCallback(() => drawRequestPoster({ request, url }), [request, url]);

  return (
    <>
      <button type="button" className="ghost" onClick={openSheet} disabled={busy}>
        <ImageIcon size={16} aria-hidden="true" /> {busy ? "Preparing…" : "Make a poster"}
      </button>
      {error && <span className="error" role="alert">{error}</span>}
      <ShareImageSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Poster for this request"
        hint="Shows the blood group, units, hospital, area and a QR code for the live status. No phone number or patient name."
        draw={draw}
        filename={`blood-needed-${request.bloodGroup}.png`}
        message={`Urgent: ${request.bloodGroup} blood needed at ${request.hospital}, ${request.area}. Live status: ${url}`}
        alt={`Poster: ${request.bloodGroup} blood needed at ${request.hospital}`}
      />
    </>
  );
}
