// v2.1 restyle: the logo always leads to the public home page, also when logged in.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  // Logged in: logo in the sidebar -> home page (not the dashboard).
  let p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.click(".sidebar a.brand-link");
  await sleep(700);
  ok("logo in the sidebar opens the home page", new URL(p.url()).pathname === "/");
  const cta = await p.$eval(".landing-nav .nav-links", (el) => el.innerText.toLowerCase());
  ok("home page offers 'Open dashboard' when logged in", cta.includes("open dashboard") && !cta.includes("get started"));
  await p.close();

  // Logged out: logo on the login and sign-up screens -> home page.
  for (const path of ["/login", "/signup"]) {
    p = await newPage({ fx: fixtures("donor"), flags: { __signedout: "1" } });
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    await sleep(500);
    await p.click(".auth-card a.brand-link");
    await sleep(600);
    ok(`logo on ${path} opens the home page`, new URL(p.url()).pathname === "/");
    const out = await p.$eval(".landing-nav .nav-links", (el) => el.innerText.toLowerCase());
    ok(`signed-out home page still shows Log in / Get started (${path})`, out.includes("log in") && out.includes("get started"));
    await p.close();
  }
}
