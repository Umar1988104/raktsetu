import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, ".dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const PORT = 4173;
export const BASE = `http://localhost:${PORT}`;

export function serve() {
  const srv = http.createServer((req, res) => {
    let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
    res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => srv.listen(PORT, () => r(srv)));
}

// Finds a browser: CHROME_PATH, then Edge/Chrome in their usual places, then a bundled Chromium (Linux).
export async function findBrowser() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH, args: [] };
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return { executablePath: c, args: [] };
  try {
    const chromium = (await import("@sparticuz/chromium")).default;
    return { executablePath: await chromium.executablePath(), args: chromium.args };
  } catch {
    throw new Error("No browser found. Install Edge/Chrome, or set CHROME_PATH to its .exe file.");
  }
}

export async function launch() {
  const { executablePath, args } = await findBrowser();
  return puppeteer.launch({ executablePath, headless: "shell", args: [...args, "--no-sandbox"] });
}

// ---------------- fixtures: the fake API ----------------
const ST = (d) => ({ date: d });
export const CARDS = [
  { cardId: "RS-7K4M-9QX2", kind: "member", isSelf: true, name: "Umar Sikandri", shortName: "Umar S.", relation: null, bloodGroup: "O+", tier: "Pillar", verified: true, hasDonorProfile: true, memberSince: "2025-03-04", stamps: [ST("2026-01-10"), ST("2026-04-12")], nextEligibleDate: "2026-11-17", eligibleToday: false, photo: null, emergencyContact: { enabled: true, name: "Asha", phone: "9123456780" }, settings: { hidden: false, show: { name: true, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false } } },
  { cardId: "RS-4PQ7-MX3H", kind: "member", isSelf: false, name: "Kamla Devi", shortName: "Kamla D.", relation: "Grandmother", bloodGroup: "B+", tier: "Trusted", verified: false, hasDonorProfile: false, memberSince: "2026-02-01", stamps: [], nextEligibleDate: null, eligibleToday: null, photo: null, emergencyContact: { enabled: false, name: "", phone: "" }, settings: { hidden: false, show: { name: false, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false } } },
  { cardId: "RS-9WXA-2KDE", kind: "member", isSelf: false, name: "Rohan Sikandri", shortName: "Rohan S.", relation: "Brother", bloodGroup: "A+", tier: "New", verified: false, hasDonorProfile: true, memberSince: "2026-05-01", stamps: [], nextEligibleDate: null, eligibleToday: true, photo: null, emergencyContact: { enabled: false, name: "", phone: "" }, settings: { hidden: false, show: { name: false, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false } } },
];

// A fixture value may be a plain object or a function (req) => body for stateful fakes.
export function fixtures(role = "donor", opts = {}) {
  const user = { name: "Umar Sikandri", role, isGuest: !!opts.guest, email: opts.guest ? undefined : "umar@example.com", familyMembers: [], hospitalName: "City Hospital", partnerVerified: !!opts.approved };
  const donor = { _id: "d1", bloodGroup: "O+", area: "Srinivaspuri", available: opts.available ?? true, hideFromMap: !!opts.hidden, verified: true, trustTier: "Trusted", donationHistory: [], display: { name: "Umar Sikandri" }, familyMemberId: null, nextEligibleDate: null, eligibleAgain: !!opts.eligibleAgain, schedule: { emergenciesOnly: false, quietHours: { enabled: false, start: "22:00", end: "07:00" } } };
  const reqs = [
    { _id: "r1", bloodGroup: "B+", units: 2, area: "Noida", hospital: "Max Hospital", status: "Searching", urgency: "Critical", contactedDonors: [] },
    { _id: "r2", bloodGroup: "O-", units: 1, area: "Delhi", hospital: "AIIMS", status: "Contacted", urgency: "Urgent", contactedDonors: [] },
    { _id: "r3", bloodGroup: "A+", units: 1, area: "Delhi", hospital: "Fortis", status: "Fulfilled", urgency: "Normal", contactedDonors: [] },
  ];
  return {
    "GET /api/auth/me": { user, donors: [donor], isAdmin: !!opts.admin },
    "GET /api/auth/me/referral": { code: "K7M2QX9A", signedUp: 3, donated: 1 },
    "GET /api/stats": { totalDonors: 128, availableDonors: 42, fulfilledRequests: 17, activeRequests: 5, criticalOpen: 2, byBloodGroup: { "A+": 20, "B+": 25, "O+": 40 }, hospitalPartners: { count: 2, names: ["City Hospital"] }, demoDataIncluded: false },
    "GET /api/camps": { camps: [] },
    "GET /api/camps/mine": { camps: [] },
    "GET /api/recurring": { plans: [] },
    "PATCH /api/donors/d1/schedule": { ok: true },
    "POST /api/requests": { request: { _id: "new1", bloodGroup: "B+", units: 2, urgency: "Normal", hospital: "City Hospital", area: "Delhi", status: "Searching", contactedDonors: [] } },
    "POST /api/recurring": { plan: { _id: "pl1" } },
    "GET /api/requests/new1": { request: { _id: "new1", bloodGroup: "B+", component: "Platelets", units: 2, urgency: "Normal", hospital: "City Hospital", area: "Delhi", status: "Searching", contactedDonors: [], lifecycle: { scheduled: true, releaseAt: new Date(Date.now() + 86400e3).toISOString() }, neededBy: new Date(Date.now() + 5 * 86400e3).toISOString(), location: { coordinates: [77.2, 28.6] } } },
    "GET /api/requests/new1/matches": { matches: [] },
    "GET /api/requests/me": { requests: reqs },
    "GET /api/requests/pending-verification": { requests: [] },
    "GET /api/donors/me": { donors: [donor] },
    "GET /api/donors": { donors: [{ _id: "d9", bloodGroup: "O+", area: "Saket", available: true, verified: false, trustTier: "New", display: { name: "Meera I.", phone: "••••••3210" } }] },
    "GET /api/donors/me/incoming-requests": { incoming: [] },
    "PATCH /api/donors/d1/availability": { ok: true },
    "PATCH /api/donors/d1/map-visibility": { ok: true },
    "GET /api/cards/mine": { guest: false, cards: CARDS },
    "GET /api/cards/public/RS-7K4M-9QX2": { card: { kind: "member", name: "Umar S.", bloodGroup: "O+", tier: "Trusted", verified: true } },
    "GET /api/cards/public/RS-PARTNR": { card: { kind: "partner", hospitalName: "City Hospital", verifiedPartner: false } },
    "GET /api/stats/impact": { totalRequests: 0, removedAsFake: 0, responseTime: { repliedSample: 0, avgFirstReplyMinutes: null, medianFirstReplyMinutes: null, acceptedSample: 0, avgFirstAcceptMinutes: null, medianFirstAcceptMinutes: null }, urgentCoverage: { windowMinutes: 30, eligible: 0, acceptedWithinWindow: 0, percent: null }, outcomes: { fulfilled: 0, expired: 0, open: 0, closed: 0, fulfilmentRate: null, expiredBreakdown: {} }, donorsByArea: [{ area: "Saket", total: 3, available: 2, verified: 1 }], totals: { donors: 3, verifiedDonors: 1, hospitalPartners: 1 }, demoDataIncluded: false, generatedAt: new Date().toISOString() },
    "GET /api/stats/heatmap": { cells: [], hiddenCells: 0, windowDays: 90, minPerCell: 5, cellKm: 11, demoDataIncluded: false },
    "GET /api/admin/overview": { users: { donors: 1, seekers: 1, hospitals: 1 }, openRequests: 0, reportedRequests: 0, throttledUsers: 0 },
    "GET /api/admin/reported": { requests: [] },
    "GET /api/admin/throttled": { users: [] },
    "GET /api/admin/hospitals": { hospitals: [{ _id: "h1", name: "Dr Rao", hospitalName: "City Hospital", phone: "9111111111", partnerVerified: false }] },
    "GET /api/admin/audit": { entries: [{ _id: "e1", action: "hospital.approve", summary: 'Approved hospital partner "City Hospital"', at: new Date().toISOString() }] },
    ...opts.extra,
  };
}

export async function newPage(browser, { fx, width = 1280, height = 800, scheme = "light", prefs, flags = {}, meDelay = 0, meFailFirst = 0, patchFail = false, log = [] } = {}) {
  let meCalls = 0;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  // Each page starts from a clean browser storage plus the flags this test asks for.
  await page.evaluateOnNewDocument((p, f) => {
    if (sessionStorage.getItem("__init")) return;
    sessionStorage.setItem("__init", "1");
    localStorage.clear();
    for (const [k, v] of Object.entries(f)) localStorage.setItem(k, v);
    if (p) localStorage.setItem("raktsetu_prefs", JSON.stringify(p));
  }, prefs, flags);
  page.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|status of (4|5)\d\d/.test(m.text())) log.push("CONSOLE " + m.text()); });
  await page.setRequestInterception(true);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  const json = (req, status, body) => req.respond({ status, contentType: "application/json", headers: cors, body: JSON.stringify(body) });
  page.on("request", async (req) => {
    const u = new URL(req.url());
    if (u.host === "api.test") {
      if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: cors });
      const key = `${req.method()} ${u.pathname}`;
      if (patchFail && req.method() === "PATCH") return json(req, 400, { error: "You are inside your donation gap" });
      if (key === "GET /api/auth/me") {
        meCalls++;
        if (meDelay) await sleep(meDelay);
        if (meCalls <= meFailFirst) return json(req, 500, { error: "Failed to fetch profile" });
      }
      const hit = fx[key];
      if (hit === null) return json(req, 404, { error: "Not found" });
      if (hit === undefined && /^GET \/api\/cards\/(public|lookup)\//.test(key)) return json(req, 404, { error: "Card not found" });
      if (key === "GET /api/admin/stats-export") return req.respond({ status: 200, contentType: "text/csv", headers: cors, body: "section,label,count\nusers_by_role,donor,40\n" });
      const body = typeof hit === "function" ? hit(req) : hit ?? {};
      return json(req, body?.__status || 200, body);
    }
    if (u.host.includes("fonts.g") || u.host.includes("openstreetmap")) return req.abort();
    req.continue();
  });
  return page;
}
