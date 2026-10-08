import { useState } from "react";
import { ShieldAlert } from "lucide-react";

// Standard, simplified pre-donation screening questions. Answering "yes" to
// any of these is a real reason a blood bank would turn someone away — this
// isn't decorative, it's meant to actually cut down wasted donor trips.
const QUESTIONS = [
  "Have you donated blood in the last 90 days?",
  "Do you currently have a fever, cold, or infection?",
  "Have you gotten a new tattoo or piercing in the last 6 months?",
  "Are you currently pregnant or breastfeeding?",
];

export default function EligibilityCheck({ onConfirm, onCancel }) {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));

  const allAnswered = answers.every((a) => a !== null);
  const anyYes = answers.some((a) => a === true);

  return (
    <div className="card" style={{ borderColor: "var(--primary)" }}>
      <h3>
        <ShieldAlert size={18} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--primary)" }} />
        Quick eligibility check
      </h3>
      <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", marginTop: -6, marginBottom: 14 }}>
        A few quick questions before you go "Available" — helps avoid a wasted trip if you're not
        eligible to donate right now.
      </p>

      {QUESTIONS.map((q, i) => (
        <div key={i} className="list-row">
          <span style={{ fontSize: "0.92rem" }}>{q}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={answers[i] === true ? "" : "ghost"}
              onClick={() => setAnswers((a) => a.map((v, idx) => (idx === i ? true : v)))}
            >
              Yes
            </button>
            <button
              className={answers[i] === false ? "" : "ghost"}
              onClick={() => setAnswers((a) => a.map((v, idx) => (idx === i ? false : v)))}
            >
              No
            </button>
          </div>
        </div>
      ))}

      {allAnswered && anyYes && (
        <p className="error" style={{ marginTop: 12 }}>
          Based on your answers, you may not be eligible to donate right now — please check with a
          doctor or blood bank before marking yourself available.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button disabled={!allAnswered || anyYes} onClick={onConfirm}>
          Confirm — I'm eligible
        </button>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
