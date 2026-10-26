// v2.1c: My impact page, share pictures (I donated + request poster), opt-in badges.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const d = (n) => new Date(Date.now() - n * 86400e3).toISOString();
  const withDonations = (fx, history) => {
    const base = fx["GET /api/donors/me"].donors[0];
    fx["GET /api/donors/me"] = { donors: [{ ...base, donationHistory: history, nextEligibleDate: new Date(Date.now() + 20 * 86400e3).toISOString() }] };
    return fx;
  };
  const imgSize = (p) => p.$eval(".share-preview img", (img) => ({ w: img.naturalWidth, h: img.naturalHeight, src: img.src }));

  // ---------- My impact with donations ----------
  let enabled = false;
  const patches = [];
  let fx = withDonations(fixtures("donor"), [{ _id: "h1", date: d(400) }, { _id: "h2", date: d(200) }, { _id: "h3", date: d(30) }]);
  fx["GET /api/auth/me/achievements"] = () => (enabled
    ? { enabled: true, total: 3, firstDonation: d(400), lastDonation: d(30), badges: [{ id: "first-drop", label: "First drop" }, { id: "regular", label: "Regular donor" }], next: { id: "committed", label: "Committed", needed: 2 }, streak: { current: 3, best: 3 } }
    : { enabled: false });
  fx["PATCH /api/auth/me/achievements"] = (req) => { const b = JSON.parse(req.postData() || "{}"); patches.push(b); enabled = b.enabled; return { enabled }; };
  let p = await newPage({ fx });
  await p.goto(`${BASE}/my-impact`, { waitUntil: "networkidle0" });
  await sleep(700);
  const text = () => p.$eval("#root", (e) => e.innerText);
  let t = await text();
  ok("shows the donation count and the 'up to' estimate with its caveat", t.includes("3") && t.includes("donations recorded") && t.includes("Up to 9") && t.includes("up to the blood bank"));
  ok("history lists every donation", (await p.$$(".impact-history li")).length === 3);
  ok("year bars are drawn", (await p.$$(".year-bars li")).length >= 2);
  ok("sidebar has My Impact (donors only)", await p.$$eval(".sidebar-link", (els) => els.some((e) => e.innerText.includes("My Impact"))));
  ok("badges are OFF by default: no badge or streak shown", !t.includes("First drop") && !t.includes("Current streak") && (await p.$eval('[aria-label="Badges and streaks"] [role=switch]', (s) => s.getAttribute("aria-checked"))) === "false");

  await p.click('[aria-label="Badges and streaks"] [role=switch]');
  await sleep(700);
  t = await text();
  if (process.env.DBG) console.log(JSON.stringify(t.slice(-700)));
  ok("turning badges on saves the choice (strict true)", patches.length === 1 && patches[0].enabled === true);
  ok("then shows badges, next badge and the streak", t.includes("First drop") && t.includes("Next badge") && t.includes("Committed") && t.includes("Current streak: 3"));
  ok("the streak note says to donate only when eligible", t.includes("never to keep a streak"));
  await p.click('[aria-label="Badges and streaks"] [role=switch]');
  await sleep(600);
  ok("turning it off hides them again", !(await text()).includes("First drop") && patches[1].enabled === false);

  // ---------- share picture ----------
  const openBtn = await p.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Make my picture")));
  await openBtn.click();
  await p.waitForSelector(".share-preview img", { timeout: 6000 }).catch(() => {});
  ok("share sheet opens with a preview picture", !!(await p.$(".share-preview img")));
  const s1 = await imgSize(p);
  ok("the picture is 1080 x 1350", s1.w === 1080 && s1.h === 1350);
  const checks = await p.$$eval(".share-options .check-row input", (els) => els.map((e) => e.checked));
  ok("defaults are private: no name, no blood group, date on", (await p.$eval("#share-name", (e) => e.value)) === "" && checks.length === 2 && checks[0] === false && checks[1] === true);
  await p.type("#share-name", "Asha");
  await p.waitForFunction((old) => document.querySelector(".share-preview img")?.src !== old, { timeout: 6000 }, s1.src).catch(() => {});
  const s2 = await imgSize(p);
  ok("changing an option redraws the picture", s2.src !== s1.src && s2.w === 1080);
  ok("a download/share button is offered", await p.$$eval(".share-actions button", (els) => els.some((e) => /picture/i.test(e.innerText) && !e.disabled)));
  await p.keyboard.press("Escape");
  await sleep(1300);
  ok("Escape closes the sheet", !(await p.$(".sheet")));
  await p.close();

  // ---------- empty state ----------
  fx = fixtures("donor");
  fx["GET /api/auth/me/achievements"] = { enabled: false };
  p = await newPage({ fx });
  await p.goto(`${BASE}/my-impact`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok("no donations yet: friendly empty state, no share button", (await text()).includes("Your first donation will show up here") && !(await p.$$eval("button", (els) => els.some((b) => b.innerText.includes("Make my picture")))));
  await p.close();

  // ---------- seeker: no impact link ----------
  p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok("seekers don't get the My Impact link", !(await p.$$eval(".sidebar-link", (els) => els.some((e) => e.innerText.includes("My Impact")))));
  await p.close();

  // ---------- request poster ----------
  fx = fixtures("seeker");
  fx["POST /api/requests/new1/share"] = { token: "tok123" };
  p = await newPage({ fx });
  await p.goto(`${BASE}/requests/new1`, { waitUntil: "networkidle0" });
  await sleep(800);
  const posterBtn = await p.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Make a poster")));
  await posterBtn.click();
  await p.waitForSelector(".share-preview img", { timeout: 6000 }).catch(() => {});
  ok("poster sheet opens", !!(await p.$(".share-preview img")));
  const ps = await imgSize(p);
  ok("poster is 1080 x 1350", ps.w === 1080 && ps.h === 1350);
  const sheetText = await p.$eval(".sheet", (e) => e.innerText);
  ok("poster says no phone number or patient name is included", sheetText.includes("No phone number or patient name"));
  await p.close();
}
