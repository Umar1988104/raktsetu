// v1.8: email verification banner, guest save-account, hospital approval, admin log + stats.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const body = (p) => p.evaluate(() => document.body.innerText);

  // Email verification banner
  let p = await newPage({ fx: fixtures("donor"), flags: { __unverified: "1" } });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("unverified email shows the verify banner", (await body(p)).includes("Verify your email"));
  await p.click('[aria-label="Verify your email"] button.ghost');
  await sleep(500);
  ok("Resend sends the verification email (and starts a cooldown)", (await p.evaluate(() => localStorage.getItem("__verifysent"))) === "1" && (await p.$eval('[aria-label="Verify your email"] button.ghost', (e) => e.disabled)));
  await p.evaluate(() => localStorage.removeItem("__unverified"));
  await p.click('[aria-label="Verify your email"] button:not(.ghost)');
  await sleep(900);
  ok("after clicking the link, 'I've verified' clears the banner", !(await body(p)).includes("Verify your email."));
  await p.close();

  p = await newPage({ fx: fixtures("donor") });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("a verified user sees no banner", !(await body(p)).includes("Verify your email."));
  await p.close();

  // Guest saves their account
  let saved = false;
  let fx = fixtures("seeker", { guest: true });
  fx["GET /api/auth/me"] = () => ({ user: { name: "Guest", role: "seeker", isGuest: !saved, email: saved ? "new@example.com" : undefined, familyMembers: [] }, donors: [], isAdmin: false });
  fx["POST /api/auth/upgrade-guest"] = () => { saved = true; return { user: {} }; };
  p = await newPage({ fx, flags: { __guest: "1" } });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("a guest sees the save-account banner", (await body(p)).includes("You're using a guest session"));
  await p.click('[aria-label="Save your account"] button');
  await sleep(800);
  await p.type('.sheet input[type=email]', "taken@example.com");
  await p.type('.sheet input[type=password]', "secret12");
  await p.click('.sheet button[type=submit]');
  await sleep(700);
  ok("an email that already has an account gets a clear message", (await body(p)).includes("already has a RaktSetu account"));
  await p.$eval('.sheet input[type=email]', (e) => { e.value = ""; });
  await p.click('.sheet input[type=email]', { clickCount: 3 });
  await p.type('.sheet input[type=email]', "new@example.com");
  await p.click('.sheet button[type=submit]');
  await sleep(1200);
  ok("saving works: the banner goes away and a verification email was sent", !(await body(p)).includes("You're using a guest session") && (await p.evaluate(() => localStorage.getItem("__verifysent"))) === "1");
  await p.close();

  // Hospital approval
  p = await newPage({ fx: fixtures("hospital", { approved: false }) });
  await p.goto(`${BASE}/verify`, { waitUntil: "networkidle0" });
  await sleep(1200);
  ok("unapproved hospital sees 'Waiting for admin approval' instead of the tools", (await body(p)).includes("Waiting for admin approval") && !(await p.$('input[aria-label="Card ID"]')));
  await p.close();

  fx = fixtures("hospital", { approved: true });
  fx["GET /api/cards/lookup/RS-7K4M-9QX2"] = { donors: [{ _id: "d9", bloodGroup: "O+", area: "Saket", verified: false, display: { name: "Umar Sikandri", phone: "9876543210" } }] };
  p = await newPage({ fx });
  await p.goto(`${BASE}/verify`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await p.type('input[aria-label="Card ID"]', "rs-7k4m-9qx2");
  await p.click("button.secondary");
  await sleep(900);
  ok("approved hospital can look a donor up by card ID", (await body(p)).includes("Umar Sikandri"));
  await p.close();

  // Admin
  fx = fixtures("seeker", { admin: true });
  fx["PATCH /api/admin/hospitals/h1/partner-verified"] = { hospital: { _id: "h1", partnerVerified: true } };
  p = await newPage({ fx, width: 1100, height: 1000 });
  await p.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
  await sleep(1400);
  ok("admin sees hospitals and the action log", (await body(p)).includes("City Hospital") && (await body(p)).includes("Admin action log"));
  await p.click('button[aria-label^="Verified partner"]');
  await sleep(800);
  ok("approving a hospital asks for confirmation", !!(await p.$(".action-sheet")));
  await (await p.$$(".action-sheet .action-group button"))[0].click();
  await sleep(900);
  ok("the switch turns on after confirming", (await p.$eval('button[aria-label^="Verified partner"]', (e) => e.getAttribute("aria-checked"))) === "true");
  await p.close();
}
