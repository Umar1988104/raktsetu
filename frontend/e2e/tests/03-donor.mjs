// Donor profile: optimistic switches with rollback, eligibility sheet, map toggle, self-declared notes.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const checked = (p, label) => p.$eval(`button[role=switch][aria-label="${label}"]`, (e) => e.getAttribute("aria-checked"));

  let p = await newPage({ fx: fixtures("donor") });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(1300);
  ok("availability starts ON", (await checked(p, "Available to donate")) === "true");
  await p.evaluate(() => { const f = window.fetch; window.fetch = (u, o) => (o && o.method === "PATCH" ? new Promise((r) => setTimeout(() => r(f(u, o)), 1500)) : f(u, o)); });
  await p.click('button[role=switch][aria-label="Available to donate"]');
  await sleep(250);
  ok("optimistic: flips OFF at once, before the server answers", (await checked(p, "Available to donate")) === "false" && (await p.$eval(".donor-card .pill", (e) => e.textContent)) === "Not available");
  await p.close();

  p = await newPage({ fx: fixtures("donor"), patchFail: true });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(1300);
  await p.click('button[role=switch][aria-label="Available to donate"]');
  await sleep(900);
  ok("rollback: flips back ON when the server refuses", (await checked(p, "Available to donate")) === "true");
  ok("an error message is shown", (await p.$$eval(".toast", (els) => els.map((e) => e.textContent).join("|"))).includes("donation gap"));
  await p.click('button[role=switch][aria-label="Show me on the map"]');
  await sleep(900);
  ok("map switch also rolls back when the server refuses", (await checked(p, "Show me on the map")) === "true");
  await p.close();

  p = await newPage({ fx: fixtures("donor") });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(1300);
  ok("map switch starts ON (visible)", (await checked(p, "Show me on the map")) === "true");
  let sent = null;
  p.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("map-visibility")) sent = r.postData(); });
  await p.click('button[role=switch][aria-label="Show me on the map"]');
  await sleep(700);
  ok("turning it OFF flips at once and tells the server hidden=true", (await checked(p, "Show me on the map")) === "false" && /"hidden":true/.test(sent || ""));
  await p.close();

  p = await newPage({ fx: fixtures("donor", { available: false }) });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(1300);
  await p.click('button[role=switch][aria-label="Available to donate"]');
  await sleep(800);
  ok("going available opens the eligibility sheet", !!(await p.$("#elig-title")));
  ok("Confirm is disabled until every question is answered", await p.$eval(".sheet .sheet-body ~ div button:last-of-type", (e) => e.disabled));
  for (const g of await p.$$(".sheet [role=radiogroup]")) await (await g.$$("button"))[1].click();
  await sleep(200);
  ok("Confirm enables after answering No to all", !(await p.$eval(".sheet .sheet-body ~ div button:last-of-type", (e) => e.disabled)));
  await p.close();

  p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/donors`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("donor network says blood group is self-declared", (await p.evaluate(() => document.body.innerText)).includes("self-declared"));
  await p.close();

  p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/requests`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("My Requests: Active shows 2 rows", (await p.$$("a.list-row")).length === 2);
  await p.click('[aria-label="Request list"] button:nth-child(2)');
  await sleep(700);
  ok("History shows 1 row; counts are shown", (await p.$$("a.list-row")).length === 1 && (await p.$eval('[aria-label="Request list"]', (e) => e.textContent)).includes("(2)"));
  await p.close();
}
