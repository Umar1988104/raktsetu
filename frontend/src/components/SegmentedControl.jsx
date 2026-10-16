import { useId } from "react";
import * as m from "motion/react-m";
import { SPRING_SNAPPY } from "../motion/springs";

// iOS-style segmented control (replaces tabs and small radio groups).
// The white "thumb" slides between segments as a shared layout element.
// options: [{ value, label, icon?, count? }]
export default function SegmentedControl({ options, value, onChange, label, block = false, large = false }) {
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

  return (
    <div
      className={`segmented ${block ? "block" : ""} ${large ? "large" : ""}`}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
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
            {o.icon}
            {o.label}
            {o.count !== undefined && <span className="seg-count">({o.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
