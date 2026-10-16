import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as m from "motion/react-m";
import { AnimatePresence, useDragControls } from "motion/react";
import useMediaQuery from "../hooks/useMediaQuery";
import { SHEET_MOBILE, SHEET_DESKTOP, SPRING_SHEET } from "../motion/springs";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// --- page lock -----------------------------------------------------------
// While any sheet is open: the page can't scroll, the page behind is inert
// (keyboard and screen readers can't wander into it), and on phones it steps
// back with a small scale — the iOS "presentation stack" look.
let openSheets = 0;
function lockPage() {
  if (openSheets++ > 0) return;
  const html = document.documentElement;
  const root = document.getElementById("root");
  const scrollbar = window.innerWidth - html.clientWidth;
  if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
  root?.style.setProperty("--sheet-oy", `${window.scrollY + window.innerHeight / 2}px`);
  html.setAttribute("data-sheet", "open");
  root?.setAttribute("inert", "");
}
function unlockPage() {
  if (--openSheets > 0) return;
  openSheets = 0;
  const html = document.documentElement;
  html.removeAttribute("data-sheet");
  html.style.paddingRight = "";
  document.getElementById("root")?.removeAttribute("inert");
}

// Bottom sheet on phones (slides up, drag the handle down to dismiss);
// centred card on larger screens. Used for confirmations, forms and settings.
export default function Sheet({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  className = "",
  initialFocusRef,
  dismissible = true,
  children,
}) {
  const isMobile = useMediaQuery("(max-width: 680px)");
  const controls = useDragControls();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement;
    lockPage();

    const focusTimer = setTimeout(() => {
      const target = initialFocusRef?.current || panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
      target?.focus();
    }, 40);

    function onKey(e) {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      unlockPage();
      if (returnTo && document.contains(returnTo)) returnTo.focus?.();
    };
  }, [open, dismissible, initialFocusRef]);

  if (typeof document === "undefined") return null;
  const preset = isMobile ? SHEET_MOBILE : SHEET_DESKTOP;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root" key="sheet">
          <m.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissible ? onClose : undefined}
          />
          <m.div
            ref={panelRef}
            className={`sheet ${className}`}
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            tabIndex={-1}
            initial={preset.initial}
            animate={preset.animate}
            exit={preset.exit}
            transition={SPRING_SHEET}
            drag={isMobile && dismissible ? "y" : false}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose?.();
            }}
          >
            {isMobile && (
              <div className="sheet-grab" onPointerDown={(e) => dismissible && controls.start(e)} aria-hidden="true">
                <span className="sheet-handle" />
              </div>
            )}
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// iOS action sheet: a title, a short message and clear choices. Cancel is
// focused first because every use of it guards something that can't be undone.
export function ActionSheet({ open, title, message, confirmLabel, cancelLabel, tone = "default", onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      role="alertdialog"
      className="action-sheet"
      labelledBy="action-title"
      describedBy="action-msg"
      initialFocusRef={cancelRef}
    >
      <h3 id="action-title">{title}</h3>
      <p id="action-msg" className="sheet-sub">{message}</p>
      <div className="action-group">
        <button type="button" className={tone === "danger" ? "danger" : ""} onClick={onConfirm}>
          {confirmLabel || "Confirm"}
        </button>
        <button ref={cancelRef} type="button" className="ghost" onClick={onCancel}>
          {cancelLabel || "Cancel"}
        </button>
      </div>
    </Sheet>
  );
}
