import * as m from "motion/react-m";
import { SPRING_SNAPPY } from "../motion/springs";

// iOS-style on/off switch. Real <button role="switch"> so it works with a
// keyboard (Space / Enter) and screen readers. The thumb moves by transform
// with a spring; the "on" colour crossfades by opacity.
export default function Switch({ checked, onChange, disabled = false, label, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="track" />
      <span className="track-on" />
      <m.span className="thumb" initial={false} animate={{ x: checked ? 20 : 0 }} transition={SPRING_SNAPPY} />
    </button>
  );
}
