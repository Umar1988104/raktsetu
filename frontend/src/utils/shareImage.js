// Share images (v2.1c): "I donated" picture and blood-request poster. Drawn in
// the browser on a canvas — nothing is uploaded; the person chooses what goes on
// the picture. The poster never carries a phone number or a patient's name.
import QRCode from "qrcode";

export const IMG_W = 1080;
export const IMG_H = 1350;
const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
const INK = "#0B0D12";
const RED = "#FF453A";

function newCanvas() {
  const c = document.createElement("canvas");
  c.width = IMG_W;
  c.height = IMG_H;
  return c;
}

function background(ctx) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, IMG_W, IMG_H);
  const glow = (x, y, r, rgba) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, IMG_W, IMG_H);
  };
  glow(IMG_W * 0.1, IMG_H * 0.95, 900, "rgba(255,59,48,0.38)");
  glow(IMG_W * 0.95, 0, 800, "rgba(10,132,255,0.28)");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, { size = 40, weight = 600, color = "#fff", align = "left", alpha = 1, maxWidth } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = `${weight} ${size}px ${FONT}`;
  if (maxWidth) ctx.fillText(str, x, y, maxWidth);
  else ctx.fillText(str, x, y);
  ctx.restore();
}

// Wraps text into lines that fit `width`; returns the baseline of the LAST line.
function wrapText(ctx, str, x, y, width, lineHeight, style) {
  ctx.save();
  ctx.font = `${style.weight || 600} ${style.size || 40}px ${FONT}`;
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  ctx.restore();
  lines.forEach((l, i) => text(ctx, l, x, y + i * lineHeight, style));
  return y + (lines.length - 1) * lineHeight;
}

function logo(ctx, x, y, size = 84) {
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, "#FF6A5F");
  g.addColorStop(1, "#D1241A");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, size, size, size * 0.29);
  ctx.fill();
  const s = size / 48;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x + 24 * s, y + 6 * s);
  ctx.lineTo(x + 35.04 * s, y + 21.75 * s);
  ctx.arc(x + 24 * s, y + 26 * s, 13.5 * s, -0.3, Math.PI + 0.3, false);
  ctx.closePath();
  ctx.fill();
  text(ctx, "RaktSetu", x + size + 24, y + size * 0.68, { size: 54, weight: 800 });
}

function footer(ctx, line) {
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(80, IMG_H - 150, IMG_W - 160, 2);
  text(ctx, line, 80, IMG_H - 88, { size: 38, weight: 700 });
  text(ctx, window.location.host, 80, IMG_H - 40, { size: 30, weight: 500, alpha: 0.7 });
}

const dateLabel = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// opts: { name?: string, bloodGroup?: string, date?: string|Date }
export function drawDonatedImage({ name, bloodGroup, date } = {}) {
  const canvas = newCanvas();
  const ctx = canvas.getContext("2d");
  background(ctx);
  logo(ctx, 80, 80);

  let y = 420;
  if (bloodGroup) {
    ctx.fillStyle = RED;
    roundRect(ctx, 80, 250, 190, 120, 36);
    ctx.fill();
    text(ctx, bloodGroup, 175, 335, { size: 76, weight: 800, align: "center" });
  }
  y = wrapText(ctx, "I donated blood.", 80, y + 60, IMG_W - 160, 130, { size: 124, weight: 800 });
  if (date) y = wrapText(ctx, `On ${dateLabel(date)}`, 80, y + 95, IMG_W - 160, 64, { size: 52, weight: 600, alpha: 0.85 });
  if (name) text(ctx, `— ${name}`, 80, y + 85, { size: 56, weight: 700, color: RED, maxWidth: IMG_W - 160 });
  wrapText(ctx, "Every drop counts. If you can, join me.", 80, IMG_H - 360, IMG_W - 160, 70, { size: 56, weight: 600, alpha: 0.9 });
  footer(ctx, "Donate or find donors on RaktSetu");
  return canvas;
}

// request: { bloodGroup, units, hospital, area, urgency, neededBy? } and a public link.
export async function drawRequestPoster({ request, url }) {
  const canvas = newCanvas();
  const ctx = canvas.getContext("2d");
  background(ctx);
  logo(ctx, 80, 80);

  const critical = request.urgency === "Critical";
  ctx.fillStyle = critical ? RED : "rgba(255,255,255,0.14)";
  roundRect(ctx, 80, 230, critical ? 430 : 360, 84, 42);
  ctx.fill();
  text(ctx, critical ? "URGENT — NEEDED NOW" : "BLOOD NEEDED", 80 + (critical ? 215 : 180), 288, { size: 38, weight: 800, align: "center" });

  text(ctx, request.bloodGroup, 70, 620, { size: 380, weight: 800, color: "#fff" });
  const units = `${request.units} unit${request.units > 1 ? "s" : ""}${request.component && request.component !== "Whole blood" ? ` · ${request.component}` : ""}`;
  text(ctx, units, 84, 712, { size: 66, weight: 700, color: RED, maxWidth: IMG_W - 168 });
  const LEFT_W = 560; // the QR code sits to the right of this column
  let y = wrapText(ctx, request.hospital, 84, 800, LEFT_W, 64, { size: 54, weight: 800 });
  y = wrapText(ctx, request.area, 84, y + 62, LEFT_W, 54, { size: 42, weight: 500, alpha: 0.8 });
  const when = request.neededBy ? `Needed by ${dateLabel(request.neededBy)}` : "Needed now";
  text(ctx, when, 84, y + 66, { size: 42, weight: 700, color: "#FFCC00", maxWidth: LEFT_W });

  // QR code to the live status page
  const qr = await QRCode.toDataURL(url, { width: 300, margin: 1, color: { dark: "#0B0D12", light: "#FFFFFF" } });
  const img = await new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = qr;
  });
  if (img) {
    ctx.fillStyle = "#fff";
    roundRect(ctx, IMG_W - 80 - 300 - 24, IMG_H - 560, 348, 348, 28);
    ctx.fill();
    ctx.drawImage(img, IMG_W - 80 - 300, IMG_H - 536, 300, 300);
  }
  wrapText(ctx, "Scan for the live status, or help by sharing.", 84, IMG_H - 250, LEFT_W, 50, { size: 38, weight: 600, alpha: 0.9 });
  footer(ctx, "Shared via RaktSetu");
  return canvas;
}

export const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));

export function canShareFiles(blob, filename) {
  try {
    const file = new File([blob], filename, { type: "image/png" });
    return !!(navigator.canShare && navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

// Opens the phone's share sheet with the picture when possible, else downloads it.
export async function shareOrDownload(blob, filename, message) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: message });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "downloaded";
}
