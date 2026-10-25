// Help chatbot brain (v2.1). NOT AI: it scores the question against the curated
// Q&A list in data/faq.js (keywords, question wording, a little of the answer)
// with light typo tolerance. It can only return a pre-written answer or say it
// found nothing — it never makes an answer up. Works in English and Hindi.
import { FAQ } from "../data/faq.js";

const STOP_EN = new Set(["a", "an", "the", "is", "are", "am", "do", "does", "did", "i", "my", "me", "mine", "how", "what", "can", "could", "should", "would", "to", "of", "in", "on", "for", "and", "or", "it", "if", "when", "why", "will", "be", "with", "you", "your", "we", "there", "this", "that", "please", "pls", "tell", "about", "get", "blood", "raktsetu", "app", "website", "site", "kindly", "hey", "hi", "hello", "who", "whom", "whose", "which", "where", "have", "has", "had", "was", "were", "at", "by", "from", "as", "into", "than", "then", "so", "just", "also", "any", "some", "one", "now", "today", "see"]);
const STOP_HI = new Set(["का", "की", "के", "में", "है", "हैं", "क्या", "कैसे", "मैं", "मेरा", "मेरी", "मेरे", "को", "से", "और", "कि", "पर", "ही", "भी", "तो", "कर", "करें", "करूँ", "करना", "सकता", "सकती", "सकते", "रक्त", "खून", "रक्तसेतु", "कृपया", "बताइए", "बताओ"]);

export function normalize(text) {
  return String(text || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u093C\u200C\u200D]/g, "") // nukta and joiners: people leave them out
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(w) {
  if (/[^ -~]/.test(w) || w.length <= 4) return w;
  return w.replace(/(ations?|ation|ions?|ing|ed|es|s|e)$/, "") || w;
}

function tokens(text) {
  return normalize(text)
    .split(" ")
    .filter((w) => w && !STOP_EN.has(w) && !STOP_HI.has(w))
    .map(stem);
}

// Edit distance, early exit above `max`.
function within(a, b, max) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > max) return false;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[n] <= max;
}

const maxTypos = (w) => (w.length >= 9 ? 2 : w.length >= 5 ? 1 : 0);

function bestMatch(t, pool) {
  // 1 = exact, 0.7 = typo, 0 = none
  let best = 0;
  for (const p of pool) {
    if (p === t) return 1;
    if (!best && maxTypos(t) && within(t, p, maxTypos(t))) best = 0.7;
  }
  return best;
}

const MEDICAL = new Set(["medicine", "medicines", "medication", "tablet", "tablets", "pill", "pills", "disease", "diabetes", "diabetic", "bp", "pressure", "fever", "cough", "cold", "infection", "hiv", "hepatitis", "malaria", "typhoid", "jaundice", "pregnant", "pregnancy", "breastfeeding", "tattoo", "piercing", "surgery", "operation", "anemia", "anaemia", "hemoglobin", "haemoglobin", "thyroid", "cancer", "covid", "vaccine", "vaccination", "alcohol", "smoking", "weight", "age", "sick", "ill", "दवा", "दवाई", "बुखार", "डायबिटीज", "मधुमेह", "गर्भवती", "गर्भ", "टैटू", "सर्जरी", "ऑपरेशन", "एनीमिया", "कैंसर", "टीका", "टीकाकरण", "शराब", "उम्र", "वज़न", "वजन", "बीमार", "बीमारी", "थायराइड", "पीलिया", "मलेरिया"]);
const GREETINGS = new Set(["hi", "hello", "hey", "hii", "namaste", "नमस्ते", "नमस्कार", "helo"]);

export function suggestedQuestions(limit = 8) {
  const ids = ["request-blood", "donate", "sos", "no-account", "gap", "phone-privacy", "no-accept", "logout"];
  return ids.map((id) => FAQ.find((e) => e.id === id)).filter(Boolean).slice(0, limit);
}

// Returns { kind: "answer"|"medical"|"greeting"|"none", entry?, related: FAQ[] }
export function answerQuestion(text, entries = FAQ) {
  const full = normalize(text);
  if (!full) return { kind: "none", related: [] };
  const words = full.split(" ");
  const qt = tokens(text);
  const isMedical = words.some((w) => MEDICAL.has(w));

  const scored = entries.map((entry) => {
    const kwPhrases = (entry.keywords || []).map(normalize);
    const kwTokens = kwPhrases.flatMap((k) => k.split(" ")).filter((w) => w && !STOP_EN.has(w) && !STOP_HI.has(w)).map(stem);
    const qTokens = [...tokens(entry.q.en), ...tokens(entry.q.hi)];
    const aTokens = new Set([...tokens(entry.a.en), ...tokens(entry.a.hi)]);
    let score = 0;
    let strong = 0;
    // the exact question (a tapped suggestion) always wins
    if (full === normalize(entry.q.en) || full === normalize(entry.q.hi)) {
      score += 100;
      strong += 3;
    }
    // whole phrases typed as written (best signal)
    for (const k of kwPhrases) {
      if (k.includes(" ") && ` ${full} `.includes(` ${k} `)) {
        score += 6;
        strong += 1;
      }
    }
    for (const t of qt) {
      const kw = bestMatch(t, kwTokens);
      const qq = bestMatch(t, qTokens);
      if (kw) {
        score += 3 * kw;
        strong += 1;
      }
      if (qq) {
        score += 2 * qq;
        strong += kw ? 0 : 1;
      }
      if (!kw && !qq && aTokens.has(t)) score += 0.4;
    }
    return { entry, score, strong };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const ok = top && top.strong >= 1 && top.score >= 2;
  const related = ok ? scored.slice(1, 4).filter((s) => s.strong >= 1 && s.score >= Math.max(3, Math.min(top.score, 12) * 0.4)).map((s) => s.entry).slice(0, 2) : [];

  if (isMedical) {
    return { kind: "medical", entry: ok ? top.entry : undefined, related: ok ? related : [entries.find((e) => e.id === "gap")].filter(Boolean) };
  }
  if (ok) return { kind: "answer", entry: top.entry, related };
  if (words.every((w) => GREETINGS.has(w))) return { kind: "greeting", related: [] };
  return { kind: "none", related: [] };
}
