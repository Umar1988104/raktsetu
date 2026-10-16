import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ActionSheet } from "./Sheet";
import { SPRING } from "../motion/springs";

// App-wide feedback:
//   const confirm = useConfirm();
//     if (!(await confirm({ title, message, confirmLabel, cancelLabel, tone: "danger" }))) return;
//   const toast = useToast();       toast("Saved", "success" | "error" | "info");
//
// Confirmations are iOS-style action sheets (bottom sheet on phones, centred
// card on larger screens). Toasts can be swiped sideways to dismiss.
const UiContext = createContext({ confirm: async () => true, toast: () => {} });

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null); // { opts, resolve }
  const [lastOpts, setLastOpts] = useState(null); // keeps the text on screen while the sheet slides away
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = "success", ms = 3500) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setLastOpts(opts);
        setDialog({ opts, resolve });
      }),
    []
  );

  function close(result) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <UiContext.Provider value={{ confirm, toast }}>
      {children}

      <ActionSheet
        open={!!dialog}
        title={(dialog?.opts || lastOpts)?.title}
        message={(dialog?.opts || lastOpts)?.message}
        confirmLabel={(dialog?.opts || lastOpts)?.confirmLabel}
        cancelLabel={(dialog?.opts || lastOpts)?.cancelLabel}
        tone={(dialog?.opts || lastOpts)?.tone}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </UiContext.Provider>
  );
}

// Rendered into <body> so it stays visible above sheets and isn't scaled
// or made inert together with the page.
function ToastStack({ toasts, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            className={`toast toast-${t.type}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
            transition={SPRING}
            drag="x"
            dragSnapToOrigin
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) onDismiss(t.id);
            }}
          >
            {t.type === "error" ? <AlertTriangle size={18} /> : t.type === "info" ? <Info size={18} /> : <CheckCircle2 size={18} />}
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
              <X size={16} />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

export const useConfirm = () => useContext(UiContext).confirm;
export const useToast = () => useContext(UiContext).toast;
