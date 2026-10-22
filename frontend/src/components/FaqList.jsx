import { useState, useId } from "react";
import * as m from "motion/react-m";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { FAQ, faqText } from "../data/faq";
import { useLang } from "../i18n";

// Accessible accordion over the shared help answers. Only transform/opacity animate.
export default function FaqList({ items = FAQ, limit }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(null);
  const uid = useId();
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div className="faq">
      {shown.map((e) => {
        const isOpen = open === e.id;
        return (
          <div key={e.id} className={`faq-item ${isOpen ? "open" : ""}`}>
            <h3>
              <button
                type="button"
                className="faq-q"
                aria-expanded={isOpen}
                aria-controls={`${uid}-${e.id}`}
                onClick={() => setOpen(isOpen ? null : e.id)}
              >
                <span>{faqText(e, lang, "q")}</span>
                <ChevronDown size={18} className="faq-chevron" aria-hidden="true" />
              </button>
            </h3>
            {isOpen && (
              <m.div id={`${uid}-${e.id}`} className="faq-a" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="region">
                <p>{faqText(e, lang, "a")}</p>
                {e.action && (
                  <Link to={e.action.to} className="btn-outline">
                    {e.action.label[lang] || e.action.label.en}
                  </Link>
                )}
              </m.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
