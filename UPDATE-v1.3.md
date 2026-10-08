# v1.3 — Sahyog Mode (accessibility)

## What this adds
- **Voice input** — a mic button next to Hospital, Area, and (on the
  emergency form) Name fields. Click, speak, it fills the field. Built on
  the browser's free native Web Speech API (works best in Chrome).
- **Read aloud** — on a request's status page, a button reads the current
  status out loud using the browser's native speech synthesis.
- **SOS button** — a prominent red shortcut in the sidebar that jumps
  straight to a pre-filled request (urgency set to Urgent, your location
  grabbed automatically) — fewer steps when every second counts.
- **Accessible camp locator** — a new public Donation Camps page anyone can
  browse (no login needed), filterable by wheelchair ramp access. Hospital
  partner accounts can post new camps with accessibility tags.
- **Recurring-patient profiles** — for family members needing regular
  transfusions (e.g. Thalassemia). Set a condition, interval, and last
  transfusion date on a family member, and a reminder banner appears on the
  Dashboard when they're due. Worth knowing: this only checks when you open
  the app — it can't send you a notification while the app is closed, since
  that would need a scheduled background job we haven't built.
- **Caregiver access** — already solved by the family-accounts system from
  before: a caregiver manages requests and donor profiles for someone else
  entirely through their own login.

## How to apply
1. Stop both servers.
2. Unzip `raktsetu-v1.3.zip`.
3. Copy its `backend` folder into your real `raktsetu\backend`, overwrite when asked.
4. Copy its `frontend` folder into your real `raktsetu\frontend`, overwrite when asked.
5. No npm install needed.
6. Start both servers as normal.

## How to test it
1. As a seeker, go to New Request, click the mic icon next to Hospital, and
   speak a hospital name — allow microphone permission if asked.
2. On a request's status page, click "Read aloud".
3. Click the red "SOS — Request Now" link in the sidebar.
4. Visit `/camps` directly (works even logged out). As a hospital account,
   post a camp with the wheelchair ramp box checked, then check the
   "Wheelchair-accessible only" filter picks it up.
5. On Profile → Family members, add someone with "Needs regular
   transfusions" checked, a condition name, and a last-transfusion date
   several weeks back — go to Dashboard and you should see the reminder.

## Push to GitHub
```
git add . && git commit -m "v1.3: Sahyog Mode - voice input, SOS, accessible camps, recurring care" && git push
```
