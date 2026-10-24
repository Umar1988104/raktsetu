import { useId } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "motion/react";

// The RaktSetu mark. "Setu" means bridge: a blood drop resting on a bridge arch,
// with the bridge deck running underneath it.
// Colours come from CSS variables so it follows light / dark / high contrast.
export function BridgeMark({ size = 32, title }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF6A5F" />
          <stop offset="1" stopColor="#D1241A" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${uid}-g)`} />
      <rect x="1" y="1" width="46" height="23" rx="13" fill="#fff" opacity="0.14" />
      <path
        d="M24 6L35.04 21.75A13.5 13.5 0 1 1 12.96 21.75Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M16.5 41.5V35.5a7.5 7.5 0 0 1 15 0v6Z" fill="#D1241A" />
      <path d="M8.5 41.8h31" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

// Logo + wordmark, used in the sidebar, public headers and auth cards.
export function BrandLockup({ size = 32 }) {
  return (
    <>
      <span className="mark">
        <BridgeMark size={size} />
      </span>
      RaktSetu
    </>
  );
}

// The logo as a link: always goes to the public home page ("/"), even when
// someone is logged in. Used on every screen that shows the logo.
export function BrandLink({ className = "sidebar-brand", style }) {
  return (
    <Link to="/" className={`${className} brand-link`} style={style} aria-label="RaktSetu — go to the home page" title="Go to the home page">
      <BrandLockup />
    </Link>
  );
}

// Section divider that reuses the bridge arch.
export function BridgeDivider() {
  return (
    <div className="bridge-divider" aria-hidden="true">
      <svg viewBox="0 0 48 20" width="48" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 17h42" />
        <path d="M8 17a16 16 0 0 1 32 0" />
        <path d="M16 17a8 8 0 0 1 16 0" />
      </svg>
    </div>
  );
}

// Loading indicator: three arches light up in turn. Opacity-only animation.
export function BridgeLoader({ fullscreen = false, label }) {
  return (
    <div className={`bridge-loader ${fullscreen ? "fullscreen" : ""}`} role="status" aria-live="polite">
      <svg viewBox="0 0 72 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path className="bl-arch" d="M4 28a14 14 0 0 1 28 0" />
        <path className="bl-arch" d="M22 28a14 14 0 0 1 28 0" />
        <path className="bl-arch" d="M40 28a14 14 0 0 1 28 0" />
      </svg>
      {label ? <span className="bl-text">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );
}

// Landing hero: a donor and a patient on either bank, joined by a bridge at
// night. A pulse leaves the donor, crosses the arch and reaches the patient, and
// a blood drop rests on top. Drawn on a dark glass panel (see .landing-art).
// Only transform/opacity animate; the travelling dot is skipped for people who
// prefer reduced motion.
const ARCH = "M96 196a114 114 0 0 1 228 0";
export function HeroBridge() {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label="A donor and a patient on either side of a river, joined by a bridge, with a blood drop travelling across it">
      <defs>
        <linearGradient id={`${uid}-d`} gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="182">
          <stop offset="0" stopColor="#FF7A70" />
          <stop offset="1" stopColor="#E0281E" />
        </linearGradient>
        <linearGradient id={`${uid}-river`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4DA3FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#4DA3FF" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <circle cx="338" cy="58" r="30" fill="#FFCC00" opacity="0.9" />
      <circle cx="338" cy="58" r="52" fill="#FFCC00" opacity="0.1" />
      <rect x="0" y="214" width="420" height="86" fill={`url(#${uid}-river)`} />
      <g stroke="#9CC7FF" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M70 246h46M150 262h64M262 250h58M330 270h46" />
      </g>
      <path d="M0 196h88c8 0 12 6 12 14v10H0Z" fill="#1B2030" />
      <path d="M420 196h-88c-8 0-12 6-12 14v10h100Z" fill="#1B2030" />
      <path d={ARCH} fill="none" stroke="#FF453A" strokeWidth="14" strokeLinecap="round" />
      <path d="M126 196a84 84 0 0 1 168 0" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.28" />
      <path d="M84 196h252" stroke="#F2F4F9" strokeWidth="10" strokeLinecap="round" />
      <g stroke="#F2F4F9" strokeWidth="4" strokeLinecap="round" opacity="0.55">
        <path d="M150 196v-48M180 196v-70M210 196v-82M240 196v-70M270 196v-48" />
      </g>

      {/* the two people */}
      <g fill="#fff">
        <circle cx="46" cy="156" r="9" />
        <path d="M32 190v-14a14 14 0 0 1 28 0v14Z" />
        <circle cx="374" cy="156" r="9" />
        <path d="M360 190v-14a14 14 0 0 1 28 0v14Z" />
      </g>
      <g className="hb-pulse hb-pulse-a"><circle cx="46" cy="170" r="16" fill="none" stroke="#34C759" strokeWidth="3" /></g>
      <g className="hb-pulse hb-pulse-b"><circle cx="374" cy="170" r="16" fill="none" stroke="#34C759" strokeWidth="3" /></g>

      {/* the pulse that crosses the bridge */}
      {!reduced && (
        <circle r="7" fill="#34C759" stroke="#0A0C12" strokeWidth="3">
          <animateMotion dur="4.2s" repeatCount="indefinite" path={ARCH} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        </circle>
      )}

      <g className="hero-float">
        <path d="M210 34C210 34 160 98 160 132a50 50 0 0 0 100 0c0-34-50-98-50-98Z" fill={`url(#${uid}-d)`} />
        <path d="M188 118c0 14 8 26 20 30" stroke="#fff" strokeOpacity="0.8" strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
