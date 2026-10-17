import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import FlipCard from "./FlipCard";
import { SPRING } from "../../motion/springs";

const ASPECT = 1.586; // credit-card ratio
const PEEK_COLLAPSED = 64; // visible strip of each card while the stack is closed
const PEEK_OTHERS = 44; // strip of the other cards below the lifted one
const GAP = 16;

// iOS Wallet-style stack of the household's cards. Tap a card to lift it out
// of the stack; tap the lifted card to flip it. With one card there is no
// stack, just the card. Only transform / opacity are animated.
export default function WalletStack({ cards, qrs, selectedId, onSelect, flipped, onFlip }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(340);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 340);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = Math.round(width / ASPECT);
  const n = cards.length;
  const single = n === 1;
  const collapsedH = H + (n - 1) * PEEK_COLLAPSED;
  const liftedH = H + GAP + (n - 1) * PEEK_OTHERS;
  const containerH = single ? H : Math.max(collapsedH, liftedH);

  function positionFor(index) {
    if (single) return 0;
    if (!selectedId) return index * PEEK_COLLAPSED; // closed stack
    const selIndex = cards.findIndex((c) => c.cardId === selectedId);
    if (index === selIndex) return 0;
    const others = cards.map((_, i) => i).filter((i) => i !== selIndex);
    return H + GAP + others.indexOf(index) * PEEK_OTHERS;
  }

  function activate(card) {
    if (single || card.cardId === selectedId) onFlip();
    else onSelect(card.cardId);
  }

  return (
    <div ref={ref} className="wallet" style={{ height: containerH }}>
      {cards.map((card, i) => {
        const isSelected = card.cardId === selectedId || single;
        return (
          <m.div
            key={card.cardId}
            className="wallet-slot"
            style={{ height: H, zIndex: isSelected ? 100 : i }}
            initial={false}
            animate={{ y: positionFor(i), scale: selectedId && !isSelected ? 0.96 : 1 }}
            transition={SPRING}
            role="button"
            tabIndex={0}
            aria-label={
              isSelected
                ? `${card.kind === "partner" ? card.hospitalName : card.shortName}'s card. Press to flip it over.`
                : `${card.kind === "partner" ? card.hospitalName : card.shortName}'s card. Press to bring it to the front.`
            }
            onClick={() => activate(card)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate(card);
              }
            }}
          >
            <FlipCard card={card} qr={qrs[card.cardId]} flipped={isSelected && flipped} />
          </m.div>
        );
      })}
    </div>
  );
}
