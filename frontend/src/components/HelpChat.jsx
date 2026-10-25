import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Send, X } from "lucide-react";
import Sheet from "./Sheet";
import useMediaQuery from "../hooks/useMediaQuery";
import { useLang } from "../i18n";
import { FAQ, faqText } from "../data/faq";
import { answerQuestion, suggestedQuestions } from "../utils/faqMatch";

// Help chat (v2.1). Not AI: every reply is a pre-written answer from data/faq.js
// (the same file as the landing-page FAQ). If nothing matches, it says so and
// shows the question chips again. Questions are never stored or sent anywhere.
const byId = (id) => FAQ.find((e) => e.id === id);

export default function HelpChat() {
  const { t, lang } = useLang();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery("(max-width: 680px)");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState([{ from: "bot", kind: "intro", chips: suggestedQuestions().map((e) => e.id) }]);
  const inputRef = useRef(null);
  const fabRef = useRef(null);
  const logRef = useRef(null);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  useEffect(() => {
    if (open && !isMobile) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [open, isMobile]);

  // Printable pages (donation certificate) never show the button.
  if (pathname.startsWith("/certificate/")) return null;

  function close() {
    setOpen(false);
    setTimeout(() => fabRef.current?.focus(), 0);
  }

  function ask(question) {
    const q = question.trim();
    if (!q) return;
    const res = answerQuestion(q);
    const all = suggestedQuestions().map((e) => e.id);
    let chips = res.related.map((e) => e.id);
    if (res.kind === "none" || res.kind === "greeting") chips = all;
    else chips = [...chips, ...all.filter((id) => id !== res.entry?.id && !chips.includes(id))].slice(0, 4);
    setMsgs((m) => [...m, { from: "me", text: q }, { from: "bot", kind: res.kind, entryId: res.entry?.id, chips }]);
    setText("");
  }

  function renderBot(msg) {
    const entry = msg.entryId ? byId(msg.entryId) : null;
    let body;
    if (msg.kind === "intro") body = t("Hi! I can answer common questions about RaktSetu. Tap a question or type your own.");
    else if (msg.kind === "greeting") body = t("Hi! Ask me a question or tap one below.");
    else if (msg.kind === "none") body = t("Oops, I couldn't find that. Try another question.");
    else if (msg.kind === "medical")
      body = t("Whether you can donate depends on your health, medicines and any recent illness or procedure, and I can't judge that. Please check with your blood bank or doctor — their doctor makes the final decision.");
    else body = entry ? faqText(entry, lang, "a") : "";
    return (
      <>
        {msg.kind === "medical" && entry && <p className="chat-medical-extra">{faqText(entry, lang, "a")}</p>}
        <p>{body}</p>
        {msg.kind === "answer" && entry?.action && (
          <Link to={entry.action.to} className="btn-outline" onClick={() => isMobile && close()}>
            {entry.action.label[lang] || entry.action.label.en}
          </Link>
        )}
        {msg.chips?.length > 0 && (
          <div className="chat-chips" role="group" aria-label={t("Suggested questions")}>
            {msg.chips.map((id) => {
              const e = byId(id);
              return e ? (
                <button key={id} type="button" className="chat-chip" onClick={() => ask(faqText(e, lang, "q"))}>
                  {faqText(e, lang, "q")}
                </button>
              ) : null;
            })}
          </div>
        )}
      </>
    );
  }

  const panel = (
    <div className={`chat-panel ${isMobile ? "in-sheet" : "chat-float"}`} role={isMobile ? undefined : "dialog"} aria-labelledby={isMobile ? undefined : titleId} onKeyDown={(e) => { if (e.key === "Escape" && !isMobile) close(); }}>
      <div className="chat-head">
        <h2 id={titleId}>{t("Help")}</h2>
        <button type="button" className="icon-btn" aria-label={t("Close help")} onClick={close}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label={t("Help")}>
        {msgs.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.from}`}>
            {msg.from === "me" ? <p>{msg.text}</p> : renderBot(msg)}
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <label htmlFor={inputId} className="sr-only">{t("Ask a question")}</label>
        <input id={inputId} ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Type your question…")} autoComplete="off" maxLength={200} />
        <button type="submit" aria-label={t("Send")} disabled={!text.trim()}>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
      <p className="chat-note">{t("Answers are pre-written. Your question stays on your device.")}</p>
    </div>
  );

  return (
    <div className="chat-root no-print">
      {open && !isMobile && panel}
      {isMobile && (
        <Sheet open={open} onClose={close} labelledBy={titleId} initialFocusRef={inputRef} className="chat-sheet">
          {panel}
        </Sheet>
      )}
      <button ref={fabRef} type="button" className="chat-fab" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <MessageCircle size={20} aria-hidden="true" />
        <span>{t("Help")}</span>
      </button>
    </div>
  );
}
