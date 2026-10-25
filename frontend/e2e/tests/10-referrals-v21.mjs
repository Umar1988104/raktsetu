// v2.1: referral links — captured from ?ref=, sent once when a donor profile is created,
// invite card on the donor profile, opt-in count on the card.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const stored = (p) => p.evaluate(() => localStorage.getItem("rs_ref"));

  // 1. Link captured (tolerant of case/hyphen), junk ignored
  let p = await newPage({ fx: fixtures("donor"), flags: { __signedout: "1" } });
  await p.goto(`${BASE}/signup?ref=k7m2-qx9a`, { waitUntil: "networkidle0" });
  await sleep(400);
  ok("?ref= is remembered in clean form", (await stored(p)) === "K7M2QX9A");
  ok("sign-up page says a donor invited you (no name)", !!(await p.$(".invite-note")));
  await p.close();

  p = await newPage({ fx: fixtures("donor"), flags: { __signedout: "1" } });
  await p.goto(`${BASE}/signup?ref=hello%3Cscript%3E`, { waitUntil: "networkidle0" });
  await sleep(300);
  ok("a junk ref is never stored", (await stored(p)) === null && !(await p.$(".invite-note")));
  await p.close();

  // 2. Sent exactly once when creating a donor profile, then forgotten
  let body = null;
  const fx = fixtures("donor");
  fx["GET /api/auth/me"] = null; // account exists in Firebase, no RaktSetu profile yet
  fx["POST /api/auth/register"] = (req) => { body = JSON.parse(req.postData() || "{}"); return { user: { name: "Asha", role: "donor" } }; };
  p = await newPage({ fx, flags: { rs_ref: "K7M2QX9A" } });
  await p.goto(`${BASE}/complete-profile`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.type('form input[required]', "Asha Rao");
  const inputs = await p.$$("form input");
  await inputs[1].type("9123456780");
  await p.click('.segmented button[role=radio]:nth-child(2), .segmented button:nth-of-type(2)');
  await p.click('form button[type="submit"]');
  await sleep(800);
  ok("register request carries the invite code for a donor", body?.role === "donor" && body?.ref === "K7M2QX9A");
  ok("the code is forgotten after registering", (await stored(p)) === null);
  await p.close();

  body = null;
  p = await newPage({ fx, flags: { rs_ref: "K7M2QX9A" } });
  await p.goto(`${BASE}/complete-profile`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.type('form input[required]', "Meera K");
  const inputs2 = await p.$$("form input");
  await inputs2[1].type("9123456781");
  await p.click('form button[type="submit"]'); // seeker (default)
  await sleep(800);
  ok("a seeker's registration sends no invite code", body?.role === "seeker" && !body?.ref);
  await p.close();

  // 3. Invite card on the donor profile
  p = await newPage({ fx: fixtures("donor") });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(700);
  const link = await p.$eval("#invite-link-input", (el) => el.value).catch(() => "");
  ok("invite card shows the donor's own link", link.endsWith("/signup?ref=K7M2QX9A"));
  const counts = await p.$$eval(".invite-counts dd", (els) => els.map((e) => e.textContent));
  ok("it shows only two counts (signed up, donated)", counts.join(",") === "3,1");
  ok("it never shows names or phone numbers", !/\d{10}/.test(await p.$eval(".invite-card", (e) => e.innerText)));
  await p.close();

  // 4. Not for seekers
  p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok("seekers don't get an invite card", !(await p.$(".invite-card")));
  await p.close();
}
