import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

// App-wide feedback:
//   const confirm = useConfirm();   if (!(await confirm({ title, message, confirmLabel }))) return;
//   const toast = useToast();       toast("Saved", "success" | "error" | "info");
const UiContext = createContext({ confirm: async () => true, toast: () => {} });

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null); // { opts, resolve }
  const idRef = useRef(0);

  const toast = useCallback((message, type = "success", ms = 3500) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), ms);
  }, []);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ opts, resolve })), []);

  function close(result) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <UiContext.Provider value={{ confirm, toast }}>
      {children}

      {dialog && <ConfirmDialog opts={dialog.opts} onClose={close} />}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "error" ? <AlertTriangle size={16} /> : t.type === "info" ? <Info size={16} /> : <CheckCircle2 size={16} />}
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </UiContext.Provider>
  );
}

function ConfirmDialog({ opts, onClose }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // Focus "cancel" first — the safe choice for something destructive — and
  // support Escape (cancel) plus Tab cycling so keyboard users can't tab out
  // behind the dialog.
  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Tab") {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <h3 id="dlg-title">{opts.title}</h3>
        <p id="dlg-msg">{opts.message}</p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="ghost" onClick={() => onClose(false)}>
            {opts.cancelLabel || "Cancel"}
          </button>
          <button ref={confirmRef} type="button" onClick={() => onClose(true)}>
            {opts.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const useConfirm = () => useContext(UiContext).confirm;
export const useToast = () => useContext(UiContext).toast;
