import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import SegmentedControl from "./SegmentedControl";

// Standard, simplified pre-donation screening questions. Answering "yes" to
// any of these is a real reason a blood bank would turn someone away — this
// isn't decorative, it's meant to actually cut down wasted donor trips.
// Shown inside a bottom sheet (see ProfilePage).
const QUESTIONS = [
  "Have you donated blood in the last 3 months (4 months if you are a woman)?",
  "Do you currently have a fever, cold, or infection?",
  "Have you gotten a new tattoo or piercing in the last 6 months?",
  "Are you currently pregnant or breastfeeding?",
];

export default function EligibilityCheck({ onConfirm, onCancel }) {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));

  const allAnswered = answers.every((a) => a !== null);
  const anyYes = answers.some((a) => a === true);

  return (
    <div>
      <h3 id="elig-title">
        <ShieldAlert size={18} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--brand-text)" }} />
        Quick eligibility check
      </h3>
      <p className="sheet-sub">
        A few quick questions before you go "Available" — helps avoid a wasted trip if you're not
        eligible to donate right now.
      </p>

      <div className="sheet-body">
        {QUESTIONS.map((q, i) => (
          <div key={i} className="list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <span style={{ fontSize: "0.92rem" }}>{q}</span>
            <SegmentedControl
              block
              label={q}
              value={answers[i] === null ? "" : answers[i] ? "yes" : "no"}
              onChange={(v) => setAnswers((a) => a.map((x, idx) => (idx === i ? v === "yes" : x)))}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
        ))}
      </div>

      {allAnswered && anyYes && (
        <p className="error" style={{ marginTop: 12 }}>
          Based on your answers, you may not be eligible to donate right now — please check with a
          doctor or blood bank before marking yourself available.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button className="ghost" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button style={{ flex: 1 }} disabled={!allAnswered || anyYes} onClick={onConfirm}>
          Confirm — I'm eligible
        </button>
      </div>
    </div>
  );
}
