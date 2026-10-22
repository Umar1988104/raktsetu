import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { CheckCircle2 } from "lucide-react";
import { SPRING } from "../motion/springs";

const KEY = "raktsetu_fulfilled_seen";
const seen = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

// A quiet "it worked" moment the first time someone sees their request
// fulfilled (v2.0). No confetti — blood was needed, and someone helped.
export default function FulfilledMoment({ requestId }) {
  const [show, setShow] = useState(() => !seen().includes(requestId));
  useEffect(() => {
    if (show) {
      try { localStorage.setItem(KEY, JSON.stringify([...seen(), requestId].slice(-50))); } catch { /* fine */ }
    }
  }, [show, requestId]);
  if (!show) return null;
  return (
    <m.div className="fulfilled-moment" role="status" initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={SPRING}>
      <div className="fulfilled-check">
        <span className="fulfilled-ring" aria-hidden="true" />
        <CheckCircle2 size={44} aria-hidden="true" />
      </div>
      <div>
        <h3>Blood arranged. Thank you.</h3>
        <p>You and everyone who helped made this happen. We hope the patient recovers soon.</p>
      </div>
      <button type="button" className="ghost" onClick={() => setShow(false)}>Close</button>
    </m.div>
  );
}
