// v1.9: guided request form, plan-ahead, repeating requests, contact buttons, donor preferences, hospital tools.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const body = (p) => p.evaluate(() => document.body.innerText);
  const capture = (p, match) => {
    const seen = { body: null };
    p.on("request", (r) => { if (r.method() === "POST" && r.url().includes(match)) seen.body = JSON.parse(r.postData() || "{}"); });
    return seen;
  };

  // ---- the guided form ----
  let p = await newPage({ fx: fixtures("seeker"), width: 1100, height: 1000 });
  const sent = capture(p, "/api/requests");
  await p.goto(`${BASE}/requests/new`, { waitUntil: "networkidle0" });
  await sleep(900);
  ok("form starts at step 1 of 3 with no blood group chosen", (await body(p)).includes("1. Patient & need") && (await p.$$('.chip-grid [aria-checked="true"]')).length === 0);
  await p.click(".wizard-actions button:last-child");
  await sleep(300);
  ok("Next without a blood group shows a clear message", (await body(p)).includes("Choose the blood group."));
  await (await p.$$(".chip-grid .chip"))[2].click(); // B+
  await p.click('[aria-label="What is needed"] button:nth-child(2)'); // Platelets
  ok("choosing platelets explains the matching", (await body(p)).includes("same blood group"));
  await p.click('button[aria-label="One more unit"]');
  await p.click(".wizard-actions button:last-child");
  await sleep(400);
  ok("step 2 asks where and when", (await body(p)).includes("Hospital") && (await body(p)).includes("When is it needed?"));
  await p.click(".wizard-actions button:last-child");
  await sleep(300);
  ok("step 2 validates hospital, area and location", (await body(p)).includes("Enter the hospital name.") && (await body(p)).includes("Set the location"));
  await p.type("#hospital", "City Hospital");
  await p.type("#area", "Delhi");
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Enter coordinates manually")).click());
  await p.type('input[aria-label="Latitude"]', "28.6139");
  await p.type('input[aria-label="Longitude"]', "77.2090");
  await p.click('[aria-label="When is it needed"] button:nth-child(2)'); // Plan ahead
  await sleep(300);
  ok("Plan ahead reveals a date field and the repeat switch", !!(await p.$("#neededBy")) && !!(await p.$('button[role=switch][aria-label="Repeat this request"]')));
  await p.click('[aria-label="Urgency level"] button:nth-child(3)'); // Critical
  await sleep(300);
  ok("Critical can't be planned ahead", !(await p.$("#neededBy")) && (await body(p)).includes("always for right now"));
  await p.click('[aria-label="Urgency level"] button:nth-child(2)'); // Urgent
  await p.click('[aria-label="When is it needed"] button:nth-child(2)');
  await sleep(300);
  await p.click(".wizard-actions button:last-child");
  await sleep(400);
  ok("Next on step 2 only shows the review; nothing has been sent yet", (await p.$eval(".wizard-step.current", (e) => e.textContent)).includes("Review") && sent.body === null);
  ok("review step summarises the request", (await body(p)).includes("City Hospital") && (await body(p)).includes("Platelets") && (await body(p)).includes("Urgent"));
  await p.click('button[type=submit]');
  await sleep(1200);
  ok("submitting sends component, units and a neededBy date", sent.body?.component === "Platelets" && sent.body?.units === 2 && !!sent.body?.neededBy && sent.body?.urgency === "Urgent" && sent.body?.bloodGroup === "B+");
  ok("then opens the request page, which shows the planned banner", p.url().includes("/requests/new1") && (await body(p)).includes("Planned for"));
  await p.close();

  // ---- repeat -> recurring plan ----
  p = await newPage({ fx: fixtures("seeker"), width: 1100, height: 1000 });
  const plan = capture(p, "/api/recurring");
  await p.goto(`${BASE}/requests/new`, { waitUntil: "networkidle0" });
  await sleep(800);
  await (await p.$$(".chip-grid .chip"))[7].click(); // O-
  await p.click(".wizard-actions button:last-child");
  await sleep(300);
  await p.type("#hospital", "AIIMS");
  await p.type("#area", "Delhi");
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Enter coordinates manually")).click());
  await p.type('input[aria-label="Latitude"]', "28.56");
  await p.type('input[aria-label="Longitude"]', "77.21");
  await p.click('[aria-label="When is it needed"] button:nth-child(2)');
  await sleep(300);
  await p.click('button[role=switch][aria-label="Repeat this request"]');
  await sleep(300);
  await p.select("#weeks", "2");
  await p.click(".wizard-actions button:last-child");
  await sleep(300);
  await p.click("button[type=submit]");
  await sleep(1500);
  ok("repeat sends a recurring plan (every 2 weeks) and goes to My Requests", plan.body?.everyWeeks === 2 && !!plan.body?.firstNeededAt && p.url().endsWith("/requests"));
  await p.close();

  // ---- SOS stays a single fast form ----
  p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/requests/new?sos=1`, { waitUntil: "networkidle0" });
  await sleep(800);
  ok("SOS mode is one screen (no steps) with a red Submit", !(await p.$(".wizard-steps")) && !!(await p.$("button.danger[type=submit]")));
  await p.click("button.danger[type=submit]");
  await sleep(300);
  ok("SOS still insists on a blood group", (await body(p)).includes("Choose the blood group."));
  await p.close();

  // ---- My Requests: scheduled, repeating ----
  const fx = fixtures("seeker");
  const soon = new Date(Date.now() + 5 * 86400e3).toISOString();
  fx["GET /api/requests/me"] = { requests: [
    { _id: "r1", bloodGroup: "B+", component: "Platelets", units: 2, area: "Noida", hospital: "Max Hospital", status: "Searching", urgency: "Normal", contactedDonors: [], neededBy: soon, lifecycle: { scheduled: true } },
    { _id: "r2", bloodGroup: "O-", component: "Whole blood", units: 1, area: "Delhi", hospital: "AIIMS", status: "Contacted", urgency: "Urgent", contactedDonors: [] },
  ] };
  fx["GET /api/recurring"] = { plans: [{ _id: "pl1", patientName: "Umar Sikandri", bloodGroup: "B+", component: "Whole blood", units: 1, hospital: "City Hospital", area: "Delhi", everyWeeks: 3, nextNeededAt: soon, active: true }] };
  fx["PATCH /api/recurring/pl1"] = { plan: { _id: "pl1", patientName: "Umar Sikandri", bloodGroup: "B+", component: "Whole blood", units: 1, hospital: "City Hospital", area: "Delhi", everyWeeks: 3, nextNeededAt: soon, active: false } };
  p = await newPage({ fx, width: 1100, height: 1100 });
  await p.goto(`${BASE}/requests`, { waitUntil: "networkidle0" });
  await sleep(1200);
  ok("a planned request reads 'Scheduled' and shows its component", (await body(p)).includes("Scheduled") && (await body(p)).includes("B+ Platelets"));
  ok("repeating requests are listed with their rhythm", (await body(p)).includes("Repeating requests") && (await body(p)).includes("every 3 weeks"));
  await p.click('button[role=switch][aria-label^="Repeating request for"]');
  await sleep(700);
  ok("pausing a repeating request updates it", (await body(p)).includes("paused"));
  await p.close();

  // ---- Dashboard: seeker focus ----
  p = await newPage({ fx, width: 1100, height: 1000 });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(1200);
  ok("dashboard puts the active request first, with 'Coming up' for planned ones", (await body(p)).includes("Your active request") && (await body(p)).includes("Coming up"));
  await p.close();

  // ---- Call + WhatsApp after accept ----
  const fx2 = fixtures("seeker");
  fx2["GET /api/requests/r1"] = { request: { _id: "r1", bloodGroup: "B+", component: "Whole blood", units: 2, urgency: "Normal", hospital: "Max Hospital", area: "Noida", status: "Confirmed", contactedDonors: [{ _id: "c1", status: "Accepted", respondedAt: new Date().toISOString(), donorDisplay: { name: "Meera Iyer", phone: "9876543210" } }], lifecycle: {}, location: { coordinates: [77.2, 28.6] } } };
  fx2["GET /api/requests/r1/matches"] = { matches: [] };
  p = await newPage({ fx: fx2, width: 1100, height: 1000 });
  await p.goto(`${BASE}/requests/r1`, { waitUntil: "networkidle0" });
  await sleep(1200);
  const links = await p.$$eval(".contact-buttons a", (as) => as.map((a) => a.getAttribute("href")));
  ok("accepted donor gets Call and WhatsApp links", links.some((h) => h === "tel:9876543210") && links.some((h) => h.startsWith("https://wa.me/919876543210?text=")));
  await p.close();

  // ---- Donor preferences + donate-again ----
  p = await newPage({ fx: fixtures("donor", { eligibleAgain: true }), width: 1100, height: 1000 });
  const patched = { body: null };
  p.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("/schedule")) patched.body = JSON.parse(r.postData() || "{}"); });
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
  await sleep(1300);
  ok("donor sees the 'You can donate again' nudge", (await body(p)).includes("You can donate again"));
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Contact preferences")).click());
  await sleep(800);
  await p.click('.sheet button[role=switch][aria-label="Emergencies only"]');
  await p.click('.sheet button[role=switch][aria-label="Quiet hours"]');
  await sleep(300);
  ok("quiet hours reveal From/Until times", (await p.$$('.sheet input[type=time]')).length === 2);
  await p.click('.sheet button[type=submit]');
  await sleep(900);
  ok("saving sends emergencies-only and quiet hours", patched.body?.emergenciesOnly === true && patched.body?.quietHours?.enabled === true && patched.body?.quietHours?.start === "22:00");
  await p.close();

  // ---- Hospital: verify several donors ----
  const fx3 = fixtures("hospital", { approved: true });
  fx3["GET /api/donors/search"] = { donors: [
    { _id: "da", bloodGroup: "O+", area: "Saket", verified: false, display: { name: "Asha Rao", phone: "9111111111" } },
    { _id: "db", bloodGroup: "A+", area: "Noida", verified: false, display: { name: "Bhavna Sen", phone: "9222222222" } },
    { _id: "dc", bloodGroup: "B+", area: "Delhi", verified: true, display: { name: "Chetan Das", phone: "9333333333" } },
  ] };
  fx3["PATCH /api/donors/verify-many"] = { requested: 2, verified: 2 };
  p = await newPage({ fx: fx3, width: 1100, height: 1000 });
  const bulk = { body: null };
  p.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("verify-many")) bulk.body = JSON.parse(r.postData() || "{}"); });
  await p.goto(`${BASE}/verify`, { waitUntil: "networkidle0" });
  await sleep(1200);
  await p.type('input[placeholder^="Search by name"]', "a");
  await p.click('form.filter-row button[type=submit]');
  await sleep(900);
  ok("only not-yet-verified donors get tick boxes", (await p.$$('input[type=checkbox][aria-label^="Select"]')).length === 2);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Select all not yet verified")).click());
  await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Verify selected (2)")).click());
  await sleep(900);
  ok("Verify selected sends both ids and marks them verified", bulk.body?.donorIds?.length === 2 && (await p.$$eval(".pill-verified", (e) => e.length)) === 3);
  await p.close();

  // ---- Hospital: manage own camps ----
  const fx4 = fixtures("hospital", { approved: true });
  const camp = { _id: "cp1", name: "Winter Camp", date: new Date(Date.now() + 9 * 86400e3).toISOString(), address: "Road 5", area: "Saket", hospitalName: "City Hospital", accessibility: { wheelchairRamp: true } };
  fx4["GET /api/camps/mine"] = { camps: [camp] };
  fx4["GET /api/camps"] = { camps: [camp] };
  fx4["PATCH /api/camps/cp1"] = { camp };
  p = await newPage({ fx: fx4, width: 1100, height: 1100 });
  const edited = { body: null };
  p.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("/api/camps/cp1")) edited.body = JSON.parse(r.postData() || "{}"); });
  await p.goto(`${BASE}/camps`, { waitUntil: "networkidle0" });
  await sleep(1300);
  ok("approved hospital sees 'Your camps' with Edit and Cancel", (await body(p)).includes("Your camps"));
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Edit")).click());
  await sleep(800);
  await p.$eval("#ec-name", (e) => { e.value = ""; });
  await p.type("#ec-name", "Winter Camp 2");
  await p.click('.sheet button[type=submit]');
  await sleep(900);
  ok("editing a camp sends the changes", edited.body?.name === "Winter Camp 2");
  await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Cancel") && b.closest(".plan-row")).click());
  await sleep(800);
  ok("cancelling a camp asks first (red action sheet)", !!(await p.$(".action-sheet button.danger")));
  await p.close();
}
