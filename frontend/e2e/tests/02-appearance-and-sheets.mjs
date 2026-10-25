// Appearance settings, bottom sheets, logout confirmation.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  // Wait (up to 4s) for a sheet's exit animation instead of guessing a fixed delay:
  // slow machines (and the software renderer used for these checks) take longer.
  const sheetGone = (pg) => pg.waitForFunction(() => !document.querySelector(".sheet"), { timeout: 4000 }).then(() => true, () => false);
  const attr = (p, a) => p.evaluate((x) => document.documentElement.getAttribute(x), a);
  let p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.click('button[aria-label="Appearance"]');
  await sleep(800);
  ok("appearance sheet opens and the page behind is locked", !!(await p.$(".sheet")) && (await attr(p, "data-sheet")) === "open");
  await p.click('[role=radiogroup][aria-label="Theme"] button:nth-child(3)');
  await sleep(300);
  ok("dark theme applied", (await attr(p, "data-theme")) === "dark");
  await p.click('[role=radiogroup][aria-label="Text size"] button:nth-child(2)');
  ok("large text applied", (await attr(p, "data-text")) === "large");
  await p.click("button[role=switch]");
  ok("high contrast applied", (await attr(p, "data-contrast")) === "high");
  await p.keyboard.press("Escape");
  await sheetGone(p);
  ok("Escape closes the sheet and unlocks the page", !(await p.$(".sheet")) && (await attr(p, "data-sheet")) === null);
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(500);
  ok("choices survive a reload", (await attr(p, "data-theme")) === "dark" && (await attr(p, "data-text")) === "large" && (await attr(p, "data-contrast")) === "high");
  await p.close();

  p = await newPage({ fx: fixtures("seeker") });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.click(".sidebar-footer button");
  await sleep(800);
  ok("logout asks first, with Cancel focused", (await p.$eval(".action-sheet h3", (e) => e.textContent)).includes("Log out") && (await p.evaluate(() => document.activeElement?.textContent?.includes("Stay signed in"))));
  await p.click(".action-sheet button.ghost");
  await sheetGone(p);
  ok("cancel keeps you signed in", !(await p.$(".sheet")) && p.url().includes("/dashboard"));
  await p.click(".sidebar-footer button");
  await sleep(700);
  await (await p.$$(".action-sheet .action-group button"))[0].click();
  await sleep(1000);
  ok("confirming logs out to /login", p.url().includes("/login"));
  await p.close();

  p = await newPage({ fx: fixtures("seeker"), width: 390, height: 844 });
  await p.goto(`${BASE}/requests`, { waitUntil: "networkidle0" });
  await sleep(1000);
  await p.evaluate(() => { document.body.style.minHeight = "2400px"; window.scrollTo(0, 300); });
  await sleep(700);
  ok("on a phone, the big title collapses into the top bar when scrolled", await p.$eval(".topbar-title", (e) => e.classList.contains("show")));
  await p.close();
}
