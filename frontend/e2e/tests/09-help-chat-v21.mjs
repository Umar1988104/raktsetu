// v2.1: help chatbot (not AI) — chips, typed questions, typos, "couldn't find", Hindi, medical, keyboard.
export default async function ({ newPage, fixtures, ok, sleep, BASE }) {
  const botTexts = (p) => p.$$eval(".chat-msg.bot", (els) => els.map((e) => e.innerText));
  const lastBot = async (p) => (await botTexts(p)).at(-1) || "";
  const typeAndSend = async (p, q) => {
    await p.click(".chat-form input", { clickCount: 3 });
    await p.type(".chat-form input", q);
    await p.keyboard.press("Enter");
    await sleep(300);
  };

  // --- logged-out visitor on the home page (desktop) ---
  let p = await newPage({ fx: fixtures("donor"), flags: { __signedout: "1" } });
  await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok("help button is on the home page", !!(await p.$(".chat-fab")));
  await p.click(".chat-fab");
  await sleep(500);
  ok("panel opens with a greeting and 8 suggestion chips", !!(await p.$(".chat-float")) && (await p.$$(".chat-msg.bot .chat-chip")).length === 8);
  ok("input is focused for typing", await p.evaluate(() => document.activeElement?.matches(".chat-form input")));

  await p.click(".chat-msg.bot .chat-chip");
  await sleep(300);
  ok("tapping a chip shows the pre-written answer", (await lastBot(p)).toLowerCase().includes("new request"));
  ok("the answer has a shortcut button into the app", !!(await p.$(".chat-msg.bot a.btn-outline")));

  await typeAndSend(p, "how do i sign out");
  ok("free text: sign out -> log out answer", (await lastBot(p)).toLowerCase().includes("log out"));
  await typeAndSend(p, "wher is logot");
  ok("typos still find the right answer", (await lastBot(p)).toLowerCase().includes("log out"));
  await typeAndSend(p, "qwertyuiop zzz");
  const none = await lastBot(p);
  ok("unknown question: says it could not find it, never invents", none.includes("Oops, I couldn't find that. Try another question."));
  ok("…and shows the question chips again", (await p.$$(".chat-msg.bot:last-child .chat-chip")).length === 8);
  await typeAndSend(p, "can I donate if I have diabetes");
  ok("medical question: careful reply that points to the blood bank", /blood bank or doctor/i.test(await lastBot(p)));
  ok("Send is disabled while the box is empty", await p.$eval('.chat-form button[type="submit"]', (b) => b.disabled));

  await p.keyboard.press("Escape");
  await sleep(300);
  ok("Escape closes the panel and returns focus to the button", !(await p.$(".chat-float")) && (await p.evaluate(() => document.activeElement?.matches(".chat-fab"))));
  await p.close();

  // --- Hindi ---
  p = await newPage({ fx: fixtures("donor"), flags: { __signedout: "1" } });
  await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await sleep(400);
  await p.click('[role=radiogroup][aria-label="Language"] button:nth-child(2), .segmented button:nth-child(2)');
  await sleep(400);
  await p.click(".chat-fab");
  await sleep(500);
  await typeAndSend(p, "लॉग आउट कैसे करें");
  ok("Hindi question gets the Hindi answer", /लॉग आउट/.test(await lastBot(p)));
  await typeAndSend(p, "ज़ज़ज़ ख़ख़ख़ घघघ");
  ok("Hindi 'not found' message", (await lastBot(p)).includes("मुझे यह नहीं मिला"));
  await p.close();

  // --- logged-in dashboard on a phone: opens as a bottom sheet ---
  p = await newPage({ fx: fixtures("seeker"), width: 390, height: 800 });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.click(".chat-fab");
  await sleep(700);
  ok("on a phone the chat is a sheet (page behind locked)", !!(await p.$(".sheet .chat-panel")) && (await p.evaluate(() => document.documentElement.getAttribute("data-sheet"))) === "open");
  await typeAndSend(p, "how do I request blood");
  ok("answer appears inside the sheet", (await lastBot(p)).toLowerCase().includes("new request"));
  await p.keyboard.press("Escape");
  await sleep(1300);
  ok("Escape closes the sheet", !(await p.$(".sheet")));
  await p.close();
}
