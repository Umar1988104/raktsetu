import { useEffect, useId, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import Sheet from "./Sheet";
import { canvasToBlob, canShareFiles, shareOrDownload } from "../utils/shareImage";

// Bottom sheet that previews a generated picture and lets the person share or
// download it. `draw` returns a canvas (or a promise of one); it re-runs whenever
// its identity changes, so the preview follows the options in `children`.
export default function ShareImageSheet({ open, onClose, title, hint, draw, filename, message, alt, children }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    let objectUrl = "";
    (async () => {
      try {
        const canvas = await draw();
        const b = await canvasToBlob(canvas);
        if (!alive || !b) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      } catch {
        if (alive) setNote("Couldn't draw the picture on this device.");
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, draw]);

  async function go() {
    if (!blob) return;
    setBusy(true);
    setNote("");
    const result = await shareOrDownload(blob, filename, message);
    setNote(result === "downloaded" ? "Saved to your downloads." : "");
    setBusy(false);
  }

  const sharing = blob ? canShareFiles(blob, filename) : false;

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId} initialFocusRef={closeRef} className="share-image-sheet">
      <h3 id={titleId}>{title}</h3>
      {hint && <p className="status">{hint}</p>}
      {children}
      <div className="share-preview">{url ? <img src={url} alt={alt} /> : <div className="share-preview-empty" aria-hidden="true" />}</div>
      <div className="share-actions">
        <button type="button" ref={closeRef} onClick={go} disabled={!blob || busy}>
          {sharing ? <Share2 size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />} {sharing ? "Share picture" : "Download picture"}
        </button>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>
      {note && <p className="status" role="status">{note}</p>}
    </Sheet>
  );
}
