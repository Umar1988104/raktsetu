# RaktSetu v2.0 — Live experience & visuals

Includes everything from v1.6 – v1.9 and the login fix, so this one zip is all you need. **No new packages to install. No database steps.**

## What's new
**Home page**
- **Animated bridge:** a donor and a patient stand on either bank; a pulse crosses the bridge between them. (If your phone is set to "reduce motion", the moving pulse is left out.)
- **"Who it's for":** short stories for **Families, Donors and Hospitals**.
- **FAQ:** 8 common questions with plain answers, in English and Hindi. All 18 help answers live in one file (`src/data/faq.js`) so the help chatbot in v2.1 can reuse them.

**Your requests**
- **Journey of a request:** created → donors notified → search widened → a donor accepted → fulfilled, each with its real time. Only things that really happened are shown.
- **It updates by itself** every 20 seconds while the request is open.
- **A calm thank-you** the first time you see a request marked fulfilled (no confetti).
- **A better map:** a dashed circle shows how far the listed donors are, pins are coloured by distance (≤3 km, 3–8 km, over 8 km), and pins that overlap merge into numbered bubbles (tap to zoom in).
- Opening a request from the list: its heading glides in from where you tapped.

**Everywhere**
- **Illustrated empty screens** and a proper **"page not found"** (a bridge with a gap).
- **Setup checklist** with a progress ring on the dashboard (verify email, add photo/address/alternate phone, create donor profile, go available…). Several steps also raise a donor's trust badge. You can hide it.
- **Notifications:** requests waiting for your answer come first ("Needs your answer"), Critical ones are marked in red; the rest are grouped by day. Swipe a finished item left (or press ✕) to dismiss it; "Show dismissed" / "Restore all" bring them back. Dismissing only hides it on your device.
- **Phone gestures:** pull down at the top of My Requests, Notifications, the Dashboard or a request to refresh; swipe in from the left edge to open the menu and swipe left to close it.

**Impact page**
- **Where blood is being requested:** a map built only from counts — areas about 11 km wide, shown only when they have **5 or more requests** in 90 days. Empty until there's enough data (that is intentional).
- **Who can give blood to whom:** tap a group to see who it can receive from and give to.

**Fix:** the home page and Impact page now count only **admin-approved** hospitals as partners (before, any hospital account was counted).

## Honest limits
- **Not tested on a real phone, with a real MongoDB, or by a Hindi speaker.** Backend: 115 automated tests pass (10 new). Browser: 114 click-through checks pass (31 new) in a real headless browser with a fake server. The swipe and pull gestures were tested with simulated touches, so please try them on your phone and tell me how they feel.
- The browser tests found two real crashes in my first draft (a router feature the app doesn't support, and a map call made too early). Both are fixed and covered by tests.
- The FAQ answers and the family/donor/hospital stories in Hindi are new and need a native speaker's review.
- Journey times for requests made before this update are best-effort (older steps may be missing; nothing is invented).
- The request map for the seeker is only as detailed as the donor positions (rounded, ~1 km).

## Apply (Windows 10, Command Prompt)
1. Stop both servers (`Ctrl+C`).
2. Extract `raktsetu-v2.0-full.zip`, then copy it over your project (change the paths to match yours; this keeps your `.env` files and `node_modules`):
   `xcopy /E /Y "C:\Users\YOU\Downloads\raktsetu-v2.0-full\*" "C:\Users\YOU\Downloads\raktsetu\"`
3. Start again (`start-raktsetu.bat`, or `npm run dev` in `backend` and in `frontend`) and hard-refresh with `Ctrl+Shift+R`.

## How to test (6 minutes)
1. **Home page** (log out first, or open it in a private window): watch the pulse cross the bridge; switch the *Families / Donors / Hospitals* tabs; open a few FAQ questions; tap **हिंदी**.
2. **404:** open `http://localhost:5173/anything` (use your own address) — you should see the broken bridge.
3. **Request journey:** open one of your requests: see the *Journey* card and the map with the dashed circle and coloured pins. Keep it open — it refreshes itself.
4. **Fulfilled:** mark a request as fulfilled → the thank-you card appears once.
5. **Checklist:** the dashboard shows *Finish setting up*; add a photo in Profile and watch the ring fill.
6. **Notifications:** (donor) check the grouping; dismiss an old item; use *Restore all*.
7. **Phone:** pull down on My Requests; swipe in from the left edge.
8. **Impact page:** tap different blood groups in the compatibility graph.
9. *(Optional)* `cd C:\Users\YOU\Downloads\raktsetu\frontend\e2e && npm test` — now 114 checks.

## Git
`cd C:\Users\YOU\Downloads\raktsetu && git add . && git commit -m "v2.0: animated hero, stories and FAQ, request journey, better map, checklist, heatmap, notification centre, gestures" && git push`
