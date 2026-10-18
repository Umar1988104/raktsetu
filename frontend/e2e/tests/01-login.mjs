// The login flow: the bug where a registered user was sent to "Tell us a bit about you".
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  async function loginFlow(opts) {
    const p = await newPage({ fx: fixtures("donor"), flags: { __signedout: "1" }, ...opts });
    await p.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await sleep(500);
    await p.type("input[type=email]", "a@b.com");
    await p.type("input[type=password]", "secret12");
    await p.click("form button[type=submit]");
    await sleep(2800);
    const url = p.url();
    await p.close();
    return url;
  }
  ok("slow profile load still lands on the dashboard", (await loginFlow({ meDelay: 900 })).includes("/dashboard"));
  ok("one failed profile fetch is retried and lands on the dashboard", (await loginFlow({ meDelay: 100, meFailFirst: 1 })).includes("/dashboard"));

  let fx = fixtures("donor");
  fx["GET /api/auth/me"] = null; // 404 = account exists in Firebase but has no RaktSetu profile
  let p = await newPage({ fx });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(900);
  ok("a brand-new account (no profile yet) goes to complete-profile", p.url().includes("/complete-profile"));
  await p.close();

  p = await newPage({ fx: fixtures("donor") });
  await p.goto(`${BASE}/complete-profile`, { waitUntil: "networkidle0" });
  await sleep(900);
  ok("a registered user on complete-profile is sent to the dashboard", p.url().includes("/dashboard"));
  await p.close();

  p = await newPage({ fx: fixtures("donor") });
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await sleep(900);
  ok("an already signed-in user opening /login goes to the dashboard", p.url().includes("/dashboard"));
  await p.close();

  p = await newPage({ fx: fixtures("donor"), meFailFirst: 9 });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(4500);
  ok("server down shows a retry screen, not the sign-up form", (await p.evaluate(() => document.body.innerText)).includes("Can't reach RaktSetu"));
  await p.close();
}
