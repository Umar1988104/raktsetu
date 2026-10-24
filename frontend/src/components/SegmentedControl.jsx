import { useId } from "react";
import * as m from "motion/react-m";
import { SPRING_SNAPPY } from "../motion/springs";

// iOS-style segmented control (replaces tabs and small radio groups).
// The white "thumb" slides between segments as a shared layout element.
// options: [{ value, label, icon?, count? }]
// variant="vials": the RaktSetu signature. Each option is a colour-capped test tube;
// the selected one fills with blood. `caption` is a small label above the row.
const CAPS = ["var(--cap-1)", "var(--cap-2)", "var(--cap-3)", "var(--cap-4)", "var(--cap-5)"];

export default function SegmentedControl({ options, value, onChange, label, block = false, large = false, variant, caption }) {
  const vials = variant === "vials";
  const uid = useId();

  function onKeyDown(e) {
    const i = options.findIndex((o) => o.value === value);
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;
    else return;
    e.preventDefault();
    onChange(options[next].value);
    // move focus with the selection (radiogroup keyboard pattern)
    e.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
  }

  const control = (
    <div
      className={`segmented ${block ? "block" : ""} ${large ? "large" : ""} ${vials ? "vials" : ""}`}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o, idx) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
          >
            {selected && <m.span layoutId={`seg-${uid}`} className="seg-thumb" transition={SPRING_SNAPPY} />}
            {vials && (
              <span className="vial" aria-hidden="true">
                <i className="vial-cap" style={{ background: CAPS[idx % CAPS.length] }} />
                <span className="vial-tube">
                  <b className="vial-fill" />
                </span>
              </span>
            )}
            {o.icon}
            {o.label}
            {o.count !== undefined && <span className="seg-count">({o.count})</span>}
          </button>
        );
      })}
    </div>
  );

  if (!vials || !caption) return control;
  return (
    <div className="vials-wrap">
      <p className="vials-caption">{caption}</p>
      {control}
    </div>
  );
}
