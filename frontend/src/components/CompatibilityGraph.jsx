import { useState } from "react";
import { GROUPS, canGiveTo, canReceiveFrom } from "../data/compatibility";

// Who can give blood to whom, as a small network (v2.0). Tap a group to see
// who it can receive from (orange) and who it can give to (teal).
const CX = 180;
const CY = 165;
const R = 120;
const pos = (g) => {
  const i = GROUPS.indexOf(g);
  const a = (-90 + i * 45) * (Math.PI / 180);
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
};

export default function CompatibilityGraph() {
  const [sel, setSel] = useState("O-");
  const gives = canGiveTo(sel);
  const gets = canReceiveFrom(sel);

  const edges = [];
  for (const r of GROUPS) for (const d of canReceiveFrom(r)) if (d !== r) edges.push({ d, r });

  return (
    <div className="card">
      <h3>Who can give blood to whom</h3>
      <p className="status" style={{ marginTop: 0 }}>Tap a blood group. Teal = who it can give to. Orange = who it can receive from.</p>
      <div className="compat">
        <svg viewBox="0 0 360 330" className="compat-svg" role="img" aria-label={`Blood group compatibility network, ${sel} selected`}>
          {edges.map(({ d, r }) => {
            const a = pos(d);
            const b = pos(r);
            const out = d === sel;
            const into = r === sel;
            return (
              <line key={`${d}>${r}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={out ? "var(--brand)" : into ? "var(--orange)" : "var(--border-strong)"} strokeWidth={out || into ? 3 : 1} opacity={out || into ? 0.95 : 0.25} />
            );
          })}
          {GROUPS.map((g) => {
            const { x, y } = pos(g);
            const isSel = g === sel;
            const fill = isSel ? "var(--brand)" : gives.includes(g) ? "var(--brand-soft)" : gets.includes(g) ? "var(--orange-soft)" : "var(--surface)";
            const stroke = isSel ? "var(--brand)" : gives.includes(g) ? "var(--brand)" : gets.includes(g) ? "var(--orange)" : "var(--border-strong)";
            return (
              <g key={g} role="button" tabIndex={0} aria-label={`${g}${isSel ? ", selected" : ""}`} style={{ cursor: "pointer" }} onClick={() => setSel(g)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(g); } }}>
                <circle cx={x} cy={y} r="24" fill={fill} stroke={stroke} strokeWidth="2.5" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={isSel ? "var(--on-brand)" : "var(--text)"}>{g}</text>
              </g>
            );
          })}
        </svg>
        <div className="compat-text" aria-live="polite">
          <p><strong>{sel}</strong> can receive from: <b>{gets.join(", ")}</b></p>
          <p><strong>{sel}</strong> can give to: <b>{gives.join(", ")}</b></p>
          <p className="status">These are red-cell rules. Platelets and plasma follow different rules, and the blood bank always makes the final decision.</p>
        </div>
      </div>
    </div>
  );
}
