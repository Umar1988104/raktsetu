// The RaktSetu card: wallet stack, flip, privacy sheet, public page, image download.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  let p = await newPage({ fx: fixtures("donor"), width: 1100, height: 900 });
  await p.goto(`${BASE}/card`, { waitUntil: "networkidle0" });
  await sleep(1600);
  ok("three cards in the stack", (await p.$$(".wallet-slot")).length === 3);
  const slots = await p.$$(".wallet-slot");
  await slots[2].click();
  await sleep(900);
  ok("tapping a card lifts it out and shows its actions", !!(await p.$(".card-actions")));
  await slots[2].click();
  await sleep(1100);
  ok("tapping again flips it", await p.evaluate(() => getComputedStyle(document.querySelectorAll(".flip-inner")[2]).transform !== "none"));
  await p.click("button.secondary");
  await sleep(900);
  ok("privacy sheet lists the switches", (await p.$$(".sheet button[role=switch]")).length === 8);
  await p.keyboard.press("Escape");
  await sleep(700);
  await p.close();

  // Public page needs no login
  p = await newPage({ fx: fixtures("donor"), width: 420, height: 800, flags: { __signedout: "1" } });
  await p.goto(`${BASE}/card/RS-7K4M-9QX2`, { waitUntil: "networkidle0" });
  await sleep(900);
  const text = await p.evaluate(() => document.body.innerText);
  ok("public page shows name, group, badge, verified", ["Umar S.", "O+", "Trusted", "Verified"].every((s) => text.includes(s)));
  ok("public page is marked noindex", await p.evaluate(() => !!document.querySelector('meta[name=robots][content*=noindex]')));
  await p.goto(`${BASE}/card/RS-PARTNR`, { waitUntil: "networkidle0" });
  await sleep(700);
  ok("an unverified partner is labelled 'Not verified'", (await p.evaluate(() => document.body.innerText)).includes("Not verified by RaktSetu"));
  await p.goto(`${BASE}/card/RS-NOPE-NOPE`, { waitUntil: "networkidle0" });
  await sleep(700);
  ok("an unknown card shows a friendly message", (await p.evaluate(() => document.body.innerText)).includes("Card not available"));
  await p.close();

  // Guests get no card
  const fx = fixtures("seeker", { guest: true });
  fx["GET /api/cards/mine"] = { guest: true, cards: [] };
  p = await newPage({ fx, flags: { __guest: "1" } });
  await p.goto(`${BASE}/card`, { waitUntil: "networkidle0" });
  await sleep(1000);
  ok("a guest is told to create an account for a card", (await p.evaluate(() => document.body.innerText)).includes("Guest sessions don't get"));
  await p.close();
}
