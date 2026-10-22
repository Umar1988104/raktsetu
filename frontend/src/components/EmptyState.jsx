// Calm, on-brand illustrations for empty screens (v2.0). Colours come from the
// theme so they work in light, dark and high contrast. Decorative: aria-hidden.
const ART = {
  requests: (
    <>
      <rect x="52" y="22" width="76" height="92" rx="10" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="3" />
      <rect x="68" y="14" width="44" height="16" rx="6" fill="var(--brand-soft)" stroke="var(--border-strong)" strokeWidth="3" />
      <path d="M90 46c0 0-14 17-14 27a14 14 0 0 0 28 0c0-10-14-27-14-27Z" fill="var(--brand)" />
      <path d="M66 98h48M72 108h36" stroke="var(--border-strong)" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  donors: (
    <>
      <circle cx="62" cy="52" r="14" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="3" />
      <path d="M36 104v-10a26 26 0 0 1 52 0v10" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="3" />
      <circle cx="116" cy="60" r="11" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="3" />
      <path d="M96 106v-6a20 20 0 0 1 40 0v6" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="3" />
    </>
  ),
  notifications: (
    <>
      <path d="M90 22a30 30 0 0 0-30 30v22l-10 14h80l-10-14V52a30 30 0 0 0-30-30Z" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 98a12 12 0 0 0 24 0" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 58l9 9 15-17" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  camps: (
    <>
      <path d="M30 108 90 28l60 80Z" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 108V64l-22 44Z" fill="var(--surface)" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 28V14M90 14l14 5-14 5" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 108h140" stroke="var(--border-strong)" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="80" cy="58" r="30" fill="var(--surface)" stroke="var(--brand)" strokeWidth="4" />
      <path d="M102 80l26 26" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round" />
      <path d="M68 58h24" stroke="var(--border-strong)" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  // A bridge with a gap in the middle: "page not found" / "something went wrong"
  broken: (
    <>
      <path d="M14 96h46c8 0 12-4 12-12V74" fill="none" stroke="var(--border-strong)" strokeWidth="6" strokeLinecap="round" />
      <path d="M166 96h-46c-8 0-12-4-12-12V74" fill="none" stroke="var(--border-strong)" strokeWidth="6" strokeLinecap="round" />
      <path d="M26 96a64 64 0 0 1 34-52" fill="none" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round" />
      <path d="M154 96a64 64 0 0 0-34-52" fill="none" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round" />
      <path d="M86 18c0 0-9 11-9 18a9 9 0 0 0 18 0c0-7-9-18-9-18Z" fill="var(--brand)" opacity="0.9" />
      <path d="M14 112c20-6 30 6 50 0s30 6 50 0 30 6 50 0" fill="none" stroke="var(--brand)" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
};

export default function EmptyState({ art = "requests", title, children, compact = false }) {
  return (
    <div className="empty-state" style={compact ? { padding: "24px 0 8px" } : undefined}>
      <svg className="empty-art" viewBox="0 0 180 120" aria-hidden="true" focusable="false">
        {ART[art] || ART.requests}
      </svg>
      {title && <p className="empty-title">{title}</p>}
      {children}
    </div>
  );
}
