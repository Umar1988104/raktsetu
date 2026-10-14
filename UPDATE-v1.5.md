# v1.5 — Privacy hardening, request lifecycle, moderation, impact metrics  (FULL SYNC)

Complete current source (backend + frontend). Includes everything from earlier
versions. Your `.env` files are NOT in it.

## 1. Privacy fixes — please read
An audit while building this found real problems in what I'd shipped before.
All fixed:
- **The "masked" phone numbers in v1.1 were only masked on screen.** The data
  behind the Donor Network page still contained each donor's raw phone, email,
  push token and exact location.
- **The seeker's request list sent full donor records** (exact location, push
  tokens) for every donor contacted.
- **Donors and hospitals received raw request records** that included the
  requester's IP address.
- Search boxes accepted raw regex; marking a request Fulfilled twice logged the
  donation twice; "report as fake" picked a random profile if you had several.

**The fix is structural:** every response now goes through a "whitelist" that
lists exactly which fields may leave the server, so a new field can't leak by
accident. New rules:
- A donor's full name and phone are revealed to a seeker **only after that
  donor accepts**. Before that: first name + initial ("Rohan S."), no phone.
- A requester's phone is revealed to a donor **only after the donor accepts**.
- Map pins are rounded to ~1 km (neighbourhood, not front door).
- Open browsing shows short names and masked phones. Hospitals verifying a
  donor still see full name and phone (they need it) but never email, push
  tokens or exact location.
- Accepted donors' contact details now appear on the request page ("Donors who
  accepted" with a Call button) — that's where a family should find them.

## 2. Requests now have a lifecycle
- **Auto-expiry:** Normal 72h, Urgent 48h, Critical 24h. In the last quarter of
  the time the seeker sees **"Still need blood?"** — "Yes, keep it open" (up to
  2 times) or "No longer needed".
- **Auto-escalation:** if nobody accepts, the next 10 donors are notified after
  45 min (Normal) / 20 min (Urgent) / 15 min (Critical), up to 3 extra rounds
  (40 donors in total). It stops the moment someone accepts.
- Requests where a donor has already confirmed are **not** auto-closed — a
  donor is on the way, so we ask rather than guess.
- Existing open requests get an expiry when the backend starts; any already
  older than their limit will be closed.
- Manual status buttons are now "Donor Confirmed" and "Fulfilled" only.

## 3. Admin moderation page (sidebar "Admin", admins only)
Review reported requests, close or dismiss reports (reopens the request and
lifts the block), see and lift blocked accounts.
**To make yourself admin:** sign up normally, then in Firebase Console ->
Authentication -> Users copy your **User UID**, and add this line to
`backend\.env` (comma-separate several):
`ADMIN_UIDS=paste-your-uid-here`
then restart the backend. (It's your UID, not your email, on purpose: Firebase
doesn't verify email ownership at sign-up, so an email check could be hijacked.)

## 4. Impact page (sidebar "Impact", also public at /impact)
Average/median time to a donor's first reply, % of Urgent/Critical requests
accepted within 30 minutes, fulfilled vs closed, donors per area. Every figure
shows its sample size and says "Not enough data yet" rather than guessing.

## 5. Demo data
```
cd backend
node seed-demo.js            adds clearly-labelled sample data
node seed-demo.js --remove   deletes exactly that sample data
```
Names start with "Demo", emails end in @example.invalid, placeholder phones
aren't real. While any exists, the dashboard and Impact page show
"Includes demo data" so it can't pass for real usage.

## What I could and couldn't verify
- Verified by automated tests (32 backend, 11 screen tests): the privacy
  whitelists against planted secrets, lifecycle rules, escalation conditions,
  every new endpoint's behaviour, the admin gate, the metric calculations, and
  that the demo data is valid against the real schemas.
- **NOT verified: against a real MongoDB.** I can't run a database where I
  build this, so the database queries (the expiry sweep, escalation claiming,
  seeder inserts) were tested through stand-ins. Please run the checks below on
  your machine.
- Background jobs pause when free hosting sleeps. That's why a request is also
  checked whenever someone views it, so a waiting seeker is still handled.
- Escalation sends emails through your Gmail setup, so each round can email up
  to 10 donors.

## How to apply
1. Stop both servers.
2. Unzip `raktsetu-v1.5-full.zip`; copy `backend` contents into your
   `raktsetu\backend` and `frontend` contents into `raktsetu\frontend`
   (overwrite).
3. No npm install needed.
4. (Optional) add `ADMIN_UIDS=...` to `backend\.env` as above.
5. Restart the backend and watch for "Connected to MongoDB Atlas".

## How to test on your machine
1. Log in as a seeker, create an **Urgent** request. Open it: you should see
   "N donor(s) notified". Nothing about donor phone numbers appears.
2. In your browser's developer tools (Network tab) open the request's response:
   confirm there is no `creatorIp`, no phone numbers, no coordinates for donors.
3. As a matched donor, accept it. Back on the seeker's page: "Donors who
   accepted" appears with a Call button.
4. To see expiry quickly without waiting days: in MongoDB Atlas -> Browse
   Collections -> requests, edit one open request's `expiresAt` to a time just
   in the future (e.g. 1 hour from now) and reload the request: the
   "Still need blood?" prompt should appear. Set it to a past time and reload:
   it should show as closed ("Timed out").
5. Run `node seed-demo.js`, open /impact and the dashboard; run
   `node seed-demo.js --remove` and confirm they're gone.
6. Log out of the admin account and confirm /admin shows "Admins only".

## Push to GitHub
```
git add . && git commit -m "v1.5: privacy hardening, request lifecycle, moderation, impact metrics, demo data" && git push
```
