# v1.4.1 — Richer dashboard, safer logout, corrected donation gap  (FULL SYNC)

This zip is the **complete current source** (backend + frontend), so it also
includes everything from v1.2 – v1.4. Your `.env` files are NOT in it.

## What's new
**Dashboard (all roles)**
- **Live strip** — real counts from your database: open requests, Critical
  requests, donors available right now (with a pulsing "live" dot).
- **Animated counters** on the stat cards (skipped automatically for anyone
  whose device asks for reduced motion).
- **Quick actions** — four big tiles that change by role (seeker / donor /
  hospital).
- **Role-specific cards**
  - Seeker: recent requests (and the counts now cover ALL your requests, not
    just the latest 5 — that was a bug).
  - Donor: "Waiting for your response" count + "Your donor status" (available,
    trust tier, next eligible date for each donor profile).
  - Hospital: how many Critical requests are waiting on your verification.
- **Upcoming camps** preview (real camps from the database).
- **What's new** feed + a full **What's new** page in the sidebar. It's your
  real release history by version (no made-up dates).
- **"Did you know?"** tip that changes daily. Each tip is based on published
  Indian donation guidance, and says the blood bank has the final say.

**Logout confirmation**
- Clicking Log out now opens a confirmation dialog (Cancel / Escape keep you
  signed in; the safe button is focused first; Tab stays inside the dialog).
- **Guest sessions get a stronger warning**, because a guest has no password
  or email — logging out really does mean losing access to their requests.
- A "You've been logged out" toast appears afterwards.
- The same dialog now replaces the plain browser popup when removing a family
  member or reporting a request as fake.

**Safety fix — donation gap (please read)**
While checking facts for the tips I found a mistake in my earlier work: I'd
used a flat 90 days between donations for everyone. Indian guidance says
**3 months for men and 4 months for women**. Fixed:
- Donor profiles have a new optional "Biological sex" field, used ONLY to
  pick the right gap.
- If a donor leaves it blank (including every existing donor), the app uses
  the **longer 4-month gap** — a missing answer never makes anyone eligible
  early.
- The eligibility question now reads "last 3 months (4 months if you are a
  woman)".
- Effect: an existing donor with a recent logged donation may now show a
  later "next eligible" date until they set this field.

## Honest notes
- Hindi covers the new dashboard headings and logout text; the longer tip and
  update sentences stay in English for now (they fall back safely).
- Tips come from hospital and health-press summaries of NBTC norms. Sources
  vary slightly (for example the upper age limit is 60 or 65 depending on the
  centre), and the tips say so where it matters.

## How to apply
1. Stop both servers.
2. Unzip `raktsetu-v1.4.1-full.zip`.
3. Copy the extracted `backend` folder's contents into your real
   `raktsetu\backend` (overwrite). Copy the extracted `frontend` folder's
   contents into your real `raktsetu\frontend` (overwrite).
4. No npm install needed.
5. Restart the backend (not just the frontend), then start the frontend.

## How to test
1. Log in -> the dashboard should show the live strip, quick actions, camps,
   What's new and a tip. Numbers count up when the page loads.
2. Click **Log out** -> a dialog appears. Press Escape or "Stay signed in" and
   confirm you're still logged in. Click Log out again and confirm -> you're
   taken to login with a toast.
3. As a donor: Profile -> edit your donor profile -> set "Biological sex".
4. Sidebar -> **What's new** shows the full version history.

## Push to GitHub
```
git add . && git commit -m "v1.4.1: richer dashboard, logout confirmation, corrected donation gap" && git push
```
