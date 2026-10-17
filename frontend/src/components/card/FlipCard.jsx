import * as m from "motion/react-m";
import { CardFront, CardBack } from "./CardFace";
import { SPRING_SOFT } from "../../motion/springs";

// One card that flips in 3D. Only the visible face is exposed to screen readers.
export default function FlipCard({ card, qr, flipped }) {
  return (
    <div className="flip-scene">
      <m.div
        className="flip-inner"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={SPRING_SOFT}
      >
        <div className={`rs-card tier-${card.kind === "partner" ? "partner" : (card.tier || "New").toLowerCase()} flip-face`} aria-hidden={flipped}>
          <CardFront card={card} qr={qr} />
        </div>
        <div className={`rs-card tier-${card.kind === "partner" ? "partner" : (card.tier || "New").toLowerCase()} flip-face flip-back`} aria-hidden={!flipped}>
          <CardBack card={card} />
        </div>
      </m.div>
    </div>
  );
}
