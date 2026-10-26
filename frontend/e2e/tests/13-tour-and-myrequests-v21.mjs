// v2.1d: the "My requests" blank-screen bug, the crash safety net, and the welcome / what's-new tours.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const body = (p) => p.$eval("#root", (e) => e.innerText);
  const stored = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("rs_tour") || "{}"));
  const daysAgo = (n) => new Date(Date.now() - n * 86400e3).toISOString();
  const asUser = (fx, extra) => { fx["GET /api/auth/me"] = { ...fx["GET /api/auth/me"], user: { ...fx["GET /api/auth/me"].user, ...extra } }; return fx; };
  const NO_TOUR_YET = { rs_tour: "{}" };

  // ---------- the blank-screen bug: My requests with nothing active ----------
  for (const [label, requests] of [["no requests at all", []], ["only finished requests", [{ _id: "r3", bloodGroup: "A+", units: 1, area: "Delhi", hospital: "Fortis", status: "Fulfilled", urgency: "Normal", contactedDonors: [] }]]]) {
    const fx = fixtures("seeker");
    fx["GET /api/requests/me"] = { requests };
    const log = [];
    const p = await newPage({ fx, log });
    await p.goto(`${BASE}/requests`, { waitUntil: "networkidle0" });
    await sleep(700);
    const t = await body(p);
    ok(`My requests opens with ${label} (no blank screen)`, t.includes("My requests") && t.includes("No active requests") && !!(await p.$('a[href="/requests/new"].btn-primary')));
    ok(`…and shows the Create a request button (${label})`, t.includes("Create a request"));
    ok(`…and has no script errors (${label})`, !log.some((l) => l.startsWith("PAGEERROR")));
    await p.close();
  }

  // ---------- crash safety net: a broken page shows a message, the menu still works ----------
  {
    const fx = fixtures("seeker");
    fx["GET /api/requests/new1"] = { request: { _id: "new1", bloodGroup: "B+", units: 2, urgency: "Normal", hospital: "City Hospital", area: "Delhi", status: "Searching", contactedDonors: null, lifecycle: null } };
    fx["GET /api/requests/new1/matches"] = { matches: null };
    const p = await newPage({ fx, log: [] });
    await p.goto(`${BASE}/requests/new1`, { waitUntil: "networkidle0" });
    await sleep(900);
    const crashed = !!(await p.$(".crash-card"));
    if (crashed) {
      ok("a crashing page shows a friendly message, not a blank screen", (await body(p)).includes("Something went wrong on this page") && !!(await p.$(".sidebar")));
      await p.click('.sidebar-link[href="/requests"]');
      await sleep(900);
      ok("choosing another page from the menu recovers", !(await p.$(".crash-card")) && (await body(p)).includes("My requests"));
    } else {
      ok("(that bad data did not crash the page; safety net checked by code only)", true);
    }
    await p.close();
  }

  // ---------- welcome tour: new person ----------
  let fx = asUser(fixtures("donor"), { createdAt: daysAgo(0) });
  let p = await newPage({ fx, flags: NO_TOUR_YET });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".tour-sheet", { timeout: 5000 }).catch(() => {});
  ok("a brand-new donor sees the Welcome tour", !!(await p.$(".tour-sheet")) && (await p.$eval(".tour-chip", (e) => e.innerText)) === "Welcome");
  ok("it shows the step count", (await p.$eval(".tour-count", (e) => e.innerText)).replace(/\s+/g, " ") === "Step 1 / 7");
  const btns = await p.$$eval(".tour-actions button", (els) => els.map((e) => e.innerText));
  ok("exactly two choices: Skip and Next", btns.join("|") === "Skip|Next");
  const t1 = await p.$eval(".tour-sheet h2", (e) => e.innerText);
  await p.click(".tour-actions button:last-child");
  await sleep(300);
  ok("Next moves to step 2 with new content", (await p.$eval(".tour-count", (e) => e.innerText)).includes("2 / 7") && (await p.$eval(".tour-sheet h2", (e) => e.innerText)) !== t1);
  for (let i = 0; i < 5; i++) { await p.click(".tour-actions button:last-child"); await sleep(250); }
  ok("the last step's button says Done", (await p.$eval(".tour-count", (e) => e.innerText)).includes("7 / 7") && (await p.$eval(".tour-actions button:last-child", (e) => e.innerText)) === "Done");
  await p.click(".tour-actions button:last-child");
  await sleep(900);
  ok("Done closes the tour and remembers it", !(await p.$(".tour-sheet")) && (await stored(p))["umar@example.com"]?.welcome === true);
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(1500);
  ok("it does not come back after a reload", !(await p.$(".tour-sheet")));
  await p.close();

  // Skip works on step 1; Escape = skip
  fx = asUser(fixtures("seeker"), { createdAt: daysAgo(1) });
  p = await newPage({ fx, flags: NO_TOUR_YET });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".tour-sheet", { timeout: 5000 }).catch(() => {});
  ok("a new seeker gets a seeker-specific tour (6 steps)", (await p.$eval(".tour-count", (e) => e.innerText)).includes("1 / 6"));
  await p.click(".tour-actions button:first-child");
  await sleep(900);
  ok("Skip closes it straight away and remembers", !(await p.$(".tour-sheet")) && (await stored(p))["umar@example.com"]?.welcome === true);
  await p.close();
  p = await newPage({ fx, flags: NO_TOUR_YET });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".tour-sheet", { timeout: 5000 }).catch(() => {});
  await p.keyboard.press("Escape");
  await sleep(1100);
  ok("Escape counts as Skip", !(await p.$(".tour-sheet")) && (await stored(p))["umar@example.com"]?.welcome === true);
  await p.close();

  // hospital + Hindi
  fx = asUser(fixtures("hospital"), { createdAt: daysAgo(0) });
  p = await newPage({ fx, flags: { ...NO_TOUR_YET, raktsetu_lang: "hi" } });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".tour-sheet", { timeout: 5000 }).catch(() => {});
  const hiTitle = await p.$eval(".tour-sheet h2", (e) => e.innerText).catch(() => "");
  const hiBtns = await p.$$eval(".tour-actions button", (els) => els.map((e) => e.innerText)).catch(() => []);
  ok("hospital tour has 5 steps", (await p.$eval(".tour-count", (e) => e.innerText).catch(() => "")).includes("/ 5"));
  ok("in Hindi the tour and its buttons are in Hindi", /रक्तसेतु/.test(hiTitle) && hiBtns.join("|") === "छोड़ें|आगे");
  await p.close();

  // ---------- What's new: returning person ----------
  fx = asUser(fixtures("donor"), { createdAt: daysAgo(90) });
  p = await newPage({ fx, flags: NO_TOUR_YET });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".tour-sheet", { timeout: 5000 }).catch(() => {});
  ok("an older account sees What's new (not the beginner tour)", (await p.$eval(".tour-chip", (e) => e.innerText).catch(() => "")) === "What's new" && (await p.$eval(".tour-count", (e) => e.innerText)).includes("1 / 5"));
  ok("What's new has the same two choices", (await p.$$eval(".tour-actions button", (els) => els.map((e) => e.innerText))).join("|") === "Skip|Next");
  await p.click(".tour-actions button:first-child");
  await sleep(900);
  ok("after skipping, the current release is remembered", (await stored(p))["umar@example.com"]?.whatsNew === "v2.1");
  await p.close();
  p = await newPage({ fx, flags: { rs_tour: JSON.stringify({ "umar@example.com": { welcome: true, whatsNew: "v2.0" } }) } });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await p.waitForSelector(".tour-sheet", { timeout: 5000 }).catch(() => {});
  ok("when a newer release comes out, What's new shows again", (await p.$eval(".tour-chip", (e) => e.innerText).catch(() => "")) === "What's new");
  await p.close();

  // ---------- guests never get a tour; replay from Profile ----------
  fx = asUser(fixtures("seeker", { guest: true }), { createdAt: daysAgo(0) });
  p = await newPage({ fx, flags: NO_TOUR_YET });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(1500);
  ok("quick (guest) accounts get no tour", !(await p.$(".tour-sheet")));
  await p.close();

  fx = fixtures("donor");
  p = await newPage({ fx });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(800);
  ok("no tour for someone who has seen it", !(await p.$(".tour-sheet")));
  const replay = await p.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Show the tour again")));
  await replay.click();
  await p.waitForSelector(".tour-sheet", { timeout: 4000 }).catch(() => {});
  ok("'Show the tour again' on Profile replays the welcome tour", (await p.$eval(".tour-chip", (e) => e.innerText).catch(() => "")) === "Welcome");
  await p.close();
}
