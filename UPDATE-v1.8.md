# RaktSetu v1.8 — Trust & safety foundation

Includes everything from v1.6, v1.7 and the login fix, so this one zip is all you need.

## What's new
- **Hospital approval:** hospital tools (verify requests and donors, look up cards, post camps) now unlock only after an **admin approves the hospital** (Admin page → *Hospital partners*). Until then a hospital sees a "Waiting for admin approval" screen.
- **Email verification:** new sign-ups get a free verification email from Firebase. A verified email is needed to **become a donor, go "available", accept a request, or use hospital tools**. Raising a blood request never needs it (emergencies come first). A banner at the top lets people resend the email.
- **Save a guest account:** a guest sees a "Save account" banner; adding an email + password keeps all their requests.
- **Donor map privacy:** donors get a *Show me on the map* switch. Off = they still get matched and notified, but a requester only sees them after they accept.
- **"Self-declared" notes** next to blood groups (donor list, nearby donors, donor profile form).
- **Server protection:** `helmet` security headers and rate limits (general, sign-up, new requests).
- **Privacy Policy rewritten** to match what the app really does today.
- **Admin:** an *action log* (what each admin did — no personal details, kept one year) and **Download anonymous stats (CSV)** (counts only; groups under 5 are hidden).
- **Saved browser tests** in `frontend/e2e` (55 checks, including the login flow), and **dates** in the "What's new" list.
- Small fix: the server now accepts request bodies up to 200 kb (a profile photo near the size limit could previously be rejected).

## IMPORTANT: what changes for accounts you already have
1. **Your existing hospital test account loses its powers** until you approve it. Log in as admin → Admin → *Hospital partners* → switch it on (it asks you to confirm).
2. **Existing donors/hospitals whose email isn't verified** will see the "Verify your email" banner. Click **Resend email**, open the link, then press **I've verified**. Check spam — the email comes from Firebase's default sender.
3. Raising requests, declining, and turning availability OFF still work without verifying.

## Honest limits
- **Not tested with a real MongoDB, real Firebase emails, or on a real phone.** Backend: 81 automated tests pass (24 new). Browser: 55 click-through checks pass in a real headless browser with a fake server and fake Firebase.
- Rate limits are kept in memory: they reset if the free server restarts or sleeps. When you deploy later, set the environment variable `TRUST_PROXY=1` (I'll remind you in Version 6).
- Approving a hospital is a manual decision: check it yourself outside the app (call the hospital, check its website).
- The saved browser tests were run on Linux. They are written to find Microsoft Edge on Windows 10, but I couldn't try them on Windows — tell me if they don't start.
- New Hindi strings are minimal and unreviewed. Older changelog entries (before v1.6) have no dates yet: fill them from `git log --format=%ad --date=short`.

## Apply (Windows 10, Command Prompt)
1. Stop both servers (`Ctrl+C`).
2. Extract `raktsetu-v1.8-full.zip`, then copy it over your project (change the paths to match yours; this keeps your `.env` files and `node_modules`):
   `xcopy /E /Y "C:\Users\YOU\Downloads\raktsetu-v1.8-full\*" "C:\Users\YOU\Downloads\raktsetu\"`
3. Install the two new **backend** packages:
   `cd C:\Users\YOU\Downloads\raktsetu\backend && npm install helmet express-rate-limit`
   (The frontend needs nothing new.)
4. Start again (`start-raktsetu.bat`, or `npm run dev` in `backend` and in `frontend`) and hard-refresh with `Ctrl+Shift+R`.

## How to test (5 minutes)
1. **Email banner:** log in with an account that hasn't verified. You see the orange banner. *Resend email* → open the link in your inbox → *I've verified* → banner disappears.
2. **Donor gate:** with an unverified donor, try *Available to donate* → you're told to verify your email first.
3. **Hospital gate:** log in as your hospital account → Verify page says *Waiting for admin approval*. As admin: Admin → *Hospital partners* → switch on → hospital refreshes and the tools appear.
4. **Map switch:** Profile (donor) → *Show me on the map* off → the donor no longer appears in *Donor Network* for a seeker.
5. **Guest:** open `/emergency`, raise a request as guest, go to the dashboard → *Save account* → add email + password → banner goes away.
6. **Admin:** Admin → *Admin action log* shows what you just did; *Download anonymous stats (CSV)* saves a file.
7. **Privacy Policy:** open it from the sidebar and skim — tell me if anything is wrong.
8. *(Optional)* Browser tests: `cd C:\Users\YOU\Downloads\raktsetu\frontend\e2e && npm install && npm test`

## Git
`cd C:\Users\YOU\Downloads\raktsetu && git add . && git commit -m "v1.8: trust and safety (hospital approval, email verification, rate limiting, audit log, saved tests)" && git push`

Note: `frontend\e2e\node_modules` is already ignored by git (its own `.gitignore`).
