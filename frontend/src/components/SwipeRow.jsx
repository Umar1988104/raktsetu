import { useRef } from "react";
import * as m from "motion/react-m";
import { X } from "lucide-react";

// Swipe a row to the left to dismiss it (v2.0). A "Dismiss" button does the
// same thing for people who can't or don't want to swipe. Dismissing only
// hides the row on this device.
export default function SwipeRow({ onDismiss, children }) {
  const dragged = useRef(false);
  return (
    <div className="swipe-row">
      <div className="swipe-bg" aria-hidden="true">Dismiss</div>
      <m.div
        className="swipe-fg"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0 }}
        dragSnapToOrigin
        onDragStart={() => { dragged.current = true; }}
        // A swipe that ends over a link must not also open the link.
        onClickCapture={(e) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); } }}
        onDragEnd={(_, info) => {
          setTimeout(() => { dragged.current = false; }, 80);
          if (info.offset.x < -90 || info.velocity.x < -500) onDismiss();
        }}
      >
        {children}
        <button type="button" className="swipe-x" aria-label="Dismiss this notification" onClick={onDismiss}>
          <X size={14} />
        </button>
      </m.div>
    </div>
  );
}
