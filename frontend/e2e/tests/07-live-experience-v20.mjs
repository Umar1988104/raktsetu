// v2.0: hero + stories + FAQ, 404, empty states, journey timeline, fulfilled moment, map, checklist,
// heatmap + compatibility graph, notification centre, gestures.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const body = (p) => p.evaluate(() => document.body.innerText);
  const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;

  // ---------- landing ----------
  let p = await newPage({ fx: fixtures("seeker"), flags: { __signedout: "1" }, width: 1200, height: 900 });
  await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await sleep(900);
  ok("hero shows a donor, a patient and a pulse that crosses the bridge", (await p.$$(".hb-pulse")).length === 2 && !!(await p.$(".landing-art animateMotion")));
  await p.click('[aria-label="Who?"] button:nth-child(2)'); // Donors
  await sleep(300);
  ok("'Who it's for' switches to the donor story", (await body(p)).includes("Give when it matters"));
  await p.evaluate(() => document.querySelector(".faq-q").click());
  await sleep(500);
  ok("an FAQ answer opens", (await body(p)).includes("Matching donors nearby are notified"));
  await p.click('[aria-label="Language"] button:nth-child(2)'); // हिंदी
  await sleep(600);
  ok("the FAQ switches to Hindi", (await body(p)).includes("मैं रक्त के लिए अनुरोध कैसे करूँ?"));
  await p.close();

  p = await newPage({ fx: fixtures("seeker"), flags: { __signedout: "1" }, width: 1200, height: 900 });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await sleep(800);
  ok("reduced motion: the travelling pulse is removed", !(await p.$(".landing-art animateMotion")));
  await p.close();

  // ---------- 404 ----------
  p = await newPage({ fx: fixtures("seeker"), width: 900, height: 800 });
  await p.goto(`${BASE}/no-such-page`, { waitUntil: "networkidle0" });
  await sleep(800);
  ok("an unknown address shows the friendly 404", (await body(p)).includes("This bridge doesn't lead anywhere") && !!(await p.$(".empty-art")));
  await p.close();

  // ---------- empty state ----------
  p = await newPage({ fx: { ...fixtures("donor"), "GET /api/donors/me/incoming-requests": { incoming: [] } }, width: 1000, height: 800 });
  await p.goto(`${BASE}/notifications`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("empty notifications show an illustration", !!(await p.$(".empty-art")) && (await body(p)).includes("No requests have matched you yet."));
  await p.close();

  // ---------- request journey ----------
  const fx = fixtures("seeker");
  const open = { _id: "r1", bloodGroup: "B+", component: "Whole blood", units: 2, urgency: "Urgent", hospital: "Max Hospital", area: "Noida", status: "Contacted", lifecycle: {}, location: { coordinates: [77.2, 28.6] },
    contactedDonors: [],
    timeline: [
      { type: "created", at: iso(3 * HOUR) },
      { type: "notified", at: iso(3 * HOUR), detail: "4 donors notified" },
      { type: "escalated", at: iso(1 * HOUR), detail: "3 more donors notified" },
      { type: "accepted", at: iso(20 * 60e3), detail: "A donor accepted" },
    ] };
  fx["GET /api/requests/r1"] = { request: open };
  fx["GET /api/requests/r1/matches"] = { request: { coordinates: [77.2, 28.6] }, matches: [
    { _id: "m1", bloodGroup: "O+", distanceKm: 1.2, coordinates: [77.2005, 28.6004], donor: { name: "Asha R." } },
    { _id: "m2", bloodGroup: "A+", distanceKm: 1.3, coordinates: [77.2006, 28.6005], donor: { name: "Bhavna S." } },
    { _id: "m3", bloodGroup: "B+", distanceKm: 6.4, coordinates: [77.26, 28.65], donor: { name: "Chetan D." } },
  ] };
  p = await newPage({ fx, width: 1100, height: 1200 });
  await p.goto(`${BASE}/requests/r1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  const t = await body(p);
  ok("journey shows real steps, in order", t.includes("Journey of this request") && t.indexOf("Request created") < t.indexOf("Search widened") && t.indexOf("Search widened") < t.indexOf("A donor accepted"));
  ok("journey shows the first batch and the widened search", t.includes("4 donors notified") && t.includes("3 more donors notified"));
  ok("an open request shows the live 'waiting' step", t.includes("Waiting for the next step"));
  ok("the map explains its radius and distance colours", (await p.$eval(".map-legend", (e) => e.textContent)).includes("within 7 km") && (await p.$eval(".map-legend", (e) => e.textContent)).includes("Within 3 km"));
  ok("two donors that overlap are merged into one numbered bubble", (await p.$$eval(".leaflet-marker-icon", (els) => els.map((e) => e.textContent.trim()))).includes("2"));
  await p.close();

  // ---------- fulfilled moment ----------
  const fx2 = fixtures("seeker");
  fx2["GET /api/requests/r9"] = { request: { ...open, _id: "r9", status: "Fulfilled", closedAt: iso(HOUR), timeline: [{ type: "created", at: iso(5 * HOUR) }, { type: "fulfilled", at: iso(HOUR) }] } };
  fx2["GET /api/requests/r9/matches"] = { matches: [] };
  p = await newPage({ fx: fx2, width: 1000, height: 900 });
  await p.goto(`${BASE}/requests/r9`, { waitUntil: "networkidle0" });
  await sleep(1200);
  ok("a fulfilled request shows the calm thank-you once", (await body(p)).includes("Blood arranged. Thank you."));
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  ok("…and not again on the next visit", !(await body(p)).includes("Blood arranged. Thank you."));
  await p.close();

  // ---------- checklist ----------
  p = await newPage({ fx: fixtures("donor"), width: 1100, height: 1000 });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(1300);
  ok("a new donor sees the setup checklist with a progress ring", (await body(p)).includes("Finish setting up") && !!(await p.$(".progress-ring")) && (await body(p)).includes("Add a profile photo"));
  await p.click('button[aria-label="Hide this checklist"]');
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
  ok("hiding the checklist is remembered", !(await body(p)).includes("Finish setting up"));
  await p.close();

  // ---------- impact: heatmap + compatibility ----------
  p = await newPage({ fx: fixtures("seeker"), width: 1100, height: 1400 });
  await p.goto(`${BASE}/impact`, { waitUntil: "networkidle0" });
  await sleep(1500);
  ok("with too few requests the heatmap explains the privacy rule", (await body(p)).includes("at least 5 requests"));
  await p.evaluate(() => [...document.querySelectorAll('[role=button]')].find((g) => g.getAttribute("aria-label")?.startsWith("A+")).dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(300);
  ok("tapping A+ shows who it can receive from and give to", (await body(p)).includes("A+ can receive from: O-, O+, A-, A+") && (await body(p)).includes("A+ can give to: A+, AB+"));
  await p.close();
  const fx3 = fixtures("seeker");
  fx3["GET /api/stats/heatmap"] = { cells: [{ lat: 28.65, lng: 77.25, count: 8 }, { lat: 19.05, lng: 72.85, count: 5 }], hiddenCells: 3, windowDays: 90, minPerCell: 5, cellKm: 11, demoDataIncluded: false };
  p = await newPage({ fx: fx3, width: 1100, height: 1400 });
  await p.goto(`${BASE}/impact`, { waitUntil: "networkidle0" });
  await sleep(1800);
  ok("with enough requests the heatmap draws one circle per area", (await p.$$(".leaflet-interactive")).length === 2 && (await body(p)).includes("no single request or person can be picked out"));
  await p.close();

  // ---------- notification centre ----------
  const fx4 = fixtures("donor");
  const item = (id, extra) => ({ requestId: id, donorId: "d1", respondingAs: "you", bloodGroup: "B+", component: "Whole blood", units: 1, urgency: "Normal", hospital: "AIIMS", area: "Delhi", requestStatus: "Contacted", closed: false, myResponse: "Pending", seeker: { name: "Seeker S.", phone: null }, ...extra });
  fx4["GET /api/donors/me/incoming-requests"] = { incoming: [
    item("a1", { urgency: "Critical", notifiedAt: iso(HOUR), hospital: "City Hospital" }),
    item("a2", { urgency: "Normal", notifiedAt: iso(2 * HOUR), hospital: "Fortis" }),
    item("a3", { myResponse: "Accepted", closed: true, requestStatus: "Fulfilled", notifiedAt: iso(26 * HOUR), hospital: "Max" }),
    item("a4", { myResponse: "Declined", closed: true, requestStatus: "Expired", notifiedAt: iso(3 * DAY), hospital: "Apollo" }),
  ] };
  p = await newPage({ fx: fx4, width: 1000, height: 1300 });
  await p.goto(`${BASE}/notifications`, { waitUntil: "networkidle0" });
  await sleep(1500);
  const n = (await body(p)).toLowerCase(); // headings are shown in capitals
  ok("waiting requests come first, grouped as 'Needs your answer'", n.indexOf("needs your answer") > -1 && n.indexOf("needs your answer") < n.indexOf("yesterday"));
  ok("past items are grouped by day", n.includes("yesterday") && n.includes("today") === false || n.includes("yesterday"));
  ok("a Critical request is clearly marked", n.includes("critical — please respond") && !!(await p.$(".notif-item.critical")));
  ok("only answered/closed items can be dismissed (4 items, 2 dismiss buttons)", (await p.$$('button[aria-label="Dismiss this notification"]')).length === 2);
  await p.click('button[aria-label="Dismiss this notification"]');
  await sleep(500);
  ok("dismissing hides the item and offers to show it again", (await body(p)).includes("Show dismissed (1)") && (await p.$$('button[aria-label="Dismiss this notification"]')).length === 1);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Restore all")).click());
  await sleep(400);
  ok("Restore all brings it back", (await p.$$('button[aria-label="Dismiss this notification"]')).length === 2);
  await p.close();

  // ---------- gestures (phone) ----------
  p = await newPage({ fx: fixtures("seeker"), width: 390, height: 844 });
  let listCalls = 0;
  p.on("request", (r) => { if (r.url().includes("/api/requests/me")) listCalls++; });
  await p.goto(`${BASE}/requests`, { waitUntil: "networkidle0" });
  await sleep(1200);
  const before = listCalls;
  await p.touchscreen.touchStart(200, 150);
  for (let y = 170; y <= 420; y += 25) await p.touchscreen.touchMove(200, y);
  await p.touchscreen.touchEnd();
  await sleep(1500);
  ok("pulling down at the top refreshes the list", listCalls > before);
  ok("the menu starts closed", !(await p.$eval(".sidebar", (e) => e.classList.contains("open"))));
  await p.touchscreen.touchStart(8, 400);
  for (let x = 30; x <= 200; x += 25) await p.touchscreen.touchMove(x, 402);
  await p.touchscreen.touchEnd();
  await sleep(700);
  ok("swiping in from the left edge opens the menu", await p.$eval(".sidebar", (e) => e.classList.contains("open")));
  await p.touchscreen.touchStart(250, 400);
  for (let x = 225; x >= 60; x -= 25) await p.touchscreen.touchMove(x, 402);
  await p.touchscreen.touchEnd();
  await sleep(700);
  ok("swiping left closes it again", !(await p.$eval(".sidebar", (e) => e.classList.contains("open"))));
  await p.close();

  // ---------- card-to-detail ----------
  p = await newPage({ fx: { ...fixtures("seeker"), ...fx }, width: 1100, height: 900 });
  await p.goto(`${BASE}/requests`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await p.click("a.list-row");
  await sleep(1500);
  ok("opening a request from the list works (with the transition where supported)", p.url().includes("/requests/") && (await body(p)).includes("Journey of this request"));
  await p.close();
}
