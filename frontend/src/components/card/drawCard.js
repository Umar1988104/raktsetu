import { TIER_LABEL, memberSinceLabel, shortDate, STAMP_SLOTS } from "./cardUtils";

// Draws the card (front above back) onto a canvas and downloads it as a PNG.
// 100% in the browser — nothing is uploaded anywhere.
const W = 1000;
const H = 630;
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintBackground(ctx, x, y, kind, tier) {
  let fill;
  if (kind === "partner") {
    fill = ctx.createLinearGradient(x, y, x + W, y + H);
    fill.addColorStop(0, "#0B4A6B");
    fill.addColorStop(1, "#0F766E");
  } else if (tier === "Pillar") {
    fill = ctx.createLinearGradient(x, y, x + W, y + H);
    ["#1b2a32", "#3d4e5a", "#1b2a32", "#5b6d79", "#26363f"].forEach((c, i, a) => fill.addColorStop(i / (a.length - 1), c));
  } else if (tier === "Trusted") {
    fill = ctx.createLinearGradient(x, y, x + W, y + H);
    fill.addColorStop(0, "#0F766E");
    fill.addColorStop(0.6, "#0E4F6B");
    fill.addColorStop(1, "#1B3A8A");
  } else {
    fill = "#2B5C61"; // matte
  }
  roundRect(ctx, x, y, W, H, 44);
  ctx.fillStyle = fill;
  ctx.fill();
}

function text(ctx, str, x, y, { size = 32, weight = 600, color = "#fff", align = "left", alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(str, x, y);
  ctx.restore();
}

function drawFront(ctx, x, y, card, qrImg, photoImg) {
  paintBackground(ctx, x, y, card.kind, card.tier);
  const partner = card.kind === "partner";
  text(ctx, "RaktSetu", x + 56, y + 84, { size: 34, weight: 800 });
  const badge = partner ? (card.partnerVerified ? "Verified Partner" : "Pending verification") : TIER_LABEL[card.tier] || card.tier;
  text(ctx, badge, x + W - 56, y + 82, { size: 28, weight: 700, align: "right" });

  if (partner) {
    ctx.font = `800 54px ${FONT}`;
    text(ctx, card.hospitalName || "", x + 56, y + 290, { size: 54, weight: 800 });
  } else {
    if (photoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + 100, y + 228, 44, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(photoImg, x + 56, y + 184, 88, 88);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x + 100, y + 228, 44, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();
      text(ctx, (card.shortName || "?")[0], x + 100, y + 243, { size: 44, weight: 800, align: "center" });
    }
    text(ctx, card.shortName + (card.verified ? "  ✓" : ""), x + 168, y + 224, { size: 44, weight: 700 });
    if (card.relation) text(ctx, card.relation, x + 168, y + 262, { size: 26, alpha: 0.8 });
    text(ctx, card.bloodGroup || "—", x + W - 56, y + 300, { size: 150, weight: 800, align: "right" });
  }

  text(ctx, card.cardId, x + 56, y + H - 96, { size: 40, weight: 700 });
  text(ctx, partner ? "Hospital partner" : `Member since ${memberSinceLabel(card.memberSince)}`, x + 56, y + H - 52, { size: 26, alpha: 0.85 });
  if (qrImg) {
    ctx.save();
    roundRect(ctx, x + W - 56 - 170, y + H - 56 - 170, 170, 170, 16);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.drawImage(qrImg, x + W - 56 - 160, y + H - 56 - 160, 150, 150);
    ctx.restore();
  }
}

function drawBack(ctx, x, y, card) {
  paintBackground(ctx, x, y, card.kind, card.tier);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y + 56, W, 86);
  const partner = card.kind === "partner";
  if (partner) {
    text(ctx, "Families can scan the QR code on the front", x + 56, y + 240, { size: 30 });
    text(ctx, "to confirm this hospital is a RaktSetu partner.", x + 56, y + 282, { size: 30 });
  } else {
    const stamps = card.stamps || [];
    for (let i = 0; i < STAMP_SLOTS; i++) {
      const cx = x + 56 + 60 + (i % 4) * 215;
      const cy = y + 215 + Math.floor(i / 4) * 125;
      ctx.beginPath();
      ctx.arc(cx, cy, 48, 0, Math.PI * 2);
      if (stamps[i]) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fill();
        // small drop, drawn (no emoji font needed)
        ctx.beginPath();
        ctx.moveTo(cx, cy - 30);
        ctx.bezierCurveTo(cx + 4, cy - 22, cx + 16, cy - 10, cx + 16, cy - 1);
        ctx.arc(cx, cy - 1, 16, 0, Math.PI, false);
        ctx.bezierCurveTo(cx - 16, cy - 10, cx - 4, cy - 22, cx, cy - 30);
        ctx.fillStyle = "#0F766E";
        ctx.fill();
        text(ctx, shortDate(stamps[i].date), cx, cy + 28, { size: 14, weight: 700, align: "center", color: "#0B1F2A" });
      } else {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (stamps.length > STAMP_SLOTS) text(ctx, `+${stamps.length - STAMP_SLOTS} more donations`, x + W - 56, y + 440, { size: 24, align: "right", alpha: 0.85 });
    const status = card.hasDonorProfile ? (card.nextEligibleDate ? `Next eligible: ${shortDate(card.nextEligibleDate)}` : "Eligible to donate now") : "No donor profile yet";
    text(ctx, status, x + 56, y + 462, { size: 28, weight: 700 });
    const ec = card.emergencyContact;
    if (ec?.enabled && ec.name && ec.phone) text(ctx, `Emergency contact: ${ec.name} · ${ec.phone}`, x + 56, y + 504, { size: 26 });
  }
  text(ctx, "RaktSetu member card — not a government ID or medical record.", x + 56, y + H - 44, { size: 22, alpha: 0.8 });
}

export async function downloadCardImage(card, qrDataUrl) {
  const [qrImg, photoImg] = await Promise.all([loadImage(qrDataUrl), loadImage(card.photo)]);
  const pad = 40;
  const canvas = document.createElement("canvas");
  canvas.width = W + pad * 2;
  canvas.height = H * 2 + pad * 3;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#F2F5F7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFront(ctx, pad, pad, card, qrImg, photoImg);
  drawBack(ctx, pad, pad * 2 + H, card);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't create the image");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `raktsetu-card-${card.cardId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
