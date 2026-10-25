// v2.1 batch B: camp RSVPs (count-only for hospitals) and the blood stock board.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const soon = new Date(Date.now() + 3 * 86400e3).toISOString();
  const camp = { _id: "c1", name: "Noida Blood Camp", date: soon, address: "Sector 18", area: "Noida", hospitalName: "City Hospital", accessibility: {} };

  // ---------- RSVP: signed-in donor ----------
  const calls = [];
  let fx = fixtures("donor");
  fx["GET /api/camps"] = { camps: [camp] };
  fx["GET /api/camps/rsvps/mine"] = { campIds: [] };
  fx["POST /api/camps/c1/rsvp"] = () => { calls.push("POST"); return { going: true }; };
  fx["DELETE /api/camps/c1/rsvp"] = () => { calls.push("DELETE"); return { going: false }; };
  let p = await newPage({ fx });
  await p.goto(`${BASE}/camps`, { waitUntil: "networkidle0" });
  await sleep(600);
  const btn = '.rsvp-line button';
  ok("donor sees an RSVP button", !!(await p.$(btn)) && /come/i.test(await p.$eval(btn, (b) => b.innerText)));
  await p.click(btn);
  await sleep(500);
  ok("after tapping: going, with a reminder promise", (await p.$eval(".rsvp-line", (e) => e.innerText)).includes("reminder the day before") && (await p.$eval(btn, (b) => b.getAttribute("aria-pressed"))) === "true");
  await p.click(btn);
  await sleep(500);
  ok("tapping again cancels", calls.join(",") === "POST,DELETE" && (await p.$eval(btn, (b) => b.getAttribute("aria-pressed"))) === "false");
  await p.close();

  // already going is remembered
  fx = fixtures("donor");
  fx["GET /api/camps"] = { camps: [camp] };
  fx["GET /api/camps/rsvps/mine"] = { campIds: ["c1"] };
  p = await newPage({ fx });
  await p.goto(`${BASE}/camps`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok("an existing RSVP shows as going after a reload", (await p.$eval(".rsvp-line button", (b) => b.getAttribute("aria-pressed"))) === "true");
  await p.close();

  // ---------- logged out: asked to log in ----------
  fx = fixtures("donor");
  fx["GET /api/camps"] = { camps: [camp] };
  p = await newPage({ fx, flags: { __signedout: "1" } });
  await p.goto(`${BASE}/camps`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok("logged-out visitors are asked to log in, no RSVP button", !(await p.$(".rsvp-line button")) && (await p.$eval(".rsvp-line", (e) => e.innerText)).includes("Log in"));
  await p.close();

  // ---------- hospital: count only ----------
  fx = fixtures("hospital", { approved: true });
  fx["GET /api/camps"] = { camps: [camp] };
  fx["GET /api/camps/mine"] = { camps: [{ ...camp, rsvpCount: 7 }, { ...camp, _id: "c2", name: "Second", rsvpCount: 1 }] };
  p = await newPage({ fx });
  await p.goto(`${BASE}/camps`, { waitUntil: "networkidle0" });
  await sleep(600);
  const counts = await p.$$eval(".rsvp-count", (els) => els.map((e) => e.innerText.trim()));
  ok("hospital sees how many are going (counts only)", counts.join("|") === "7 people are going|1 person is going");
  ok("hospital has no RSVP button of its own", !(await p.$(".rsvp-line button")));
  await p.close();

  // ---------- stock board: public ----------
  const levels = (o) => ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({ group: g, units: o[g] || 0, level: !o[g] ? "None" : o[g] <= 4 ? "Low" : "Available" }));
  const boards = [
    { id: "b1", hospitalName: "City Hospital", address: "1 Ring Rd", area: "Noida", location: { lat: 28.5, lng: 77.3 }, levels: levels({ "O-": 3, "B+": 12 }), updatedAt: new Date().toISOString(), hoursAgo: 3, stale: false },
    { id: "b2", hospitalName: "Old Data Hospital", address: "9 Mall Rd", area: "Delhi", location: null, levels: levels({ "A+": 8 }), updatedAt: new Date(Date.now() - 4 * 86400e3).toISOString(), hoursAgo: 96, stale: true },
  ];
  const urls = [];
  fx = fixtures("donor");
  fx["GET /api/stock"] = (req) => { urls.push(req.url()); return { boards, disclaimer: "Hand-updated by the hospital's blood bank, so it can be out of date. Stock changes quickly — please call the blood bank to confirm before you travel." }; };
  p = await newPage({ fx, flags: { __signedout: "1" } });
  await p.goto(`${BASE}/stock`, { waitUntil: "networkidle0" });
  await sleep(700);
  ok("disclaimer is always visible", (await p.$eval(".stock-disclaimer", (e) => e.innerText)).includes("call the blood bank to confirm"));
  const txt = await p.$eval("main, #root", (e) => e.innerText);
  ok("each board says how long ago it was updated", txt.includes("Updated 3h ago") && txt.includes("Updated 4 days ago"));
  ok("old data is flagged 'May be out of date'", (await p.$$(".stock-stale")).length === 1);
  const o = await p.$eval('.stock-board:first-of-type .stock-tile:last-child, .stock-board .stock-tile:nth-child(8)', (e) => e.innerText.replace(/\s+/g, " "));
  ok("levels are words and numbers, not just colour (O- : 3 Low)", /O-/.test(o) && /3/.test(o) && /Low/.test(o));
  ok("a Directions link is offered when the location is known", (await p.$$(".stock-foot a")).length === 1);
  await p.click('.stock-groups button:nth-of-type(9)'); // O-
  await sleep(600);
  ok("tapping O- asks the server for O- boards only", urls.at(-1).includes("bloodGroup=O-"));
  await p.type("#stock-area", "Noida");
  await sleep(800);
  ok("area search is sent (debounced)", urls.at(-1).includes("area=Noida"));
  await p.close();

  // ---------- hospital posts stock ----------
  let putBody = null;
  fx = fixtures("hospital", { approved: true });
  fx["GET /api/stock"] = { boards: [] };
  fx["GET /api/stock/mine"] = { board: null };
  fx["PUT /api/stock/mine"] = (req) => { putBody = JSON.parse(req.postData() || "{}"); return { board: { ...boards[0], hoursAgo: 0 } }; };
  p = await newPage({ fx });
  await p.goto(`${BASE}/stock`, { waitUntil: "networkidle0" });
  await sleep(700);
  ok("approved hospital sees the update form", !!(await p.$('form[aria-label="Update my blood stock"]')));
  await p.$eval("#su-O-", (el) => { el.value = ""; });
  await p.type("#su-O-", "6");
  await p.type("#su-address", "1 Ring Rd");
  await p.type("#su-area", "Noida");
  await p.type("#su-lat", "28.5");
  await p.type("#su-lng", "77.3");
  await p.click('form[aria-label="Update my blood stock"] button[type="submit"]');
  await sleep(700);
  ok("save sends all 8 groups plus address and location", putBody && Object.keys(putBody.levels).length === 8 && putBody.levels["O-"] === "6" && putBody.address === "1 Ring Rd" && putBody.lat === "28.5" && putBody.lng === "77.3");
  ok("a confirmation appears", (await p.$eval("body", (b) => b.innerText)).includes("Stock board updated"));
  await p.close();

  // not approved: told to wait
  fx = fixtures("hospital");
  fx["GET /api/stock"] = { boards: [] };
  p = await newPage({ fx });
  await p.goto(`${BASE}/stock`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok("unapproved hospital sees the waiting note, no form", !(await p.$('form[aria-label="Update my blood stock"]')) && (await p.$eval("body", (b) => b.innerText)).includes("waiting for admin approval"));
  await p.close();

  // seeker: no form, sidebar link present
  fx = fixtures("seeker");
  fx["GET /api/stock"] = { boards: [] };
  p = await newPage({ fx });
  await p.goto(`${BASE}/stock`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok("seekers can read the board but cannot post", !(await p.$('form[aria-label="Update my blood stock"]')));
  ok("sidebar has a Blood Stock link", (await p.$$eval(".sidebar-link", (els) => els.some((e) => e.innerText.includes("Blood Stock")))));
  await p.close();
}
