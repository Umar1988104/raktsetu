# RaktSetu v1.9 — Smarter requests & donor tools

Includes everything from v1.6 – v1.8 and the login fix, so this one zip is all you need. **No new packages to install.**

## What's new
**For people asking for blood**
- **A simpler request form** in 3 steps (Patient & need → Where & when → Review). Big tappable blood-group buttons, a units counter, urgency explained in plain words, a "Use current location" button. The blood group is **never pre-selected** — you must choose it, because a wrong default could be dangerous. SOS mode stays one fast screen.
- **Plan ahead:** need blood for a surgery next week? Pick the date (24 hours to 30 days away). Donors are contacted only about **3 days before**, so nobody is asked weeks early. The request shows as **Scheduled**.
- **Repeating requests** (for regular transfusions such as thalassemia or dialysis): choose "Repeat every N weeks". RaktSetu creates each request for you about a week before it's due and emails you a reminder. See, pause, skip or stop them under **My Requests**. Needs a verified email, up to 5 at a time.
- **Platelets or plasma**, not just blood. Platelets match the same blood group; plasma follows its own rule (AB plasma suits everyone). The blood bank always decides if a donor is suitable.
- **Call and WhatsApp buttons** once a donor accepts (and for donors, once they accept a request).
- **Dashboard shows what matters first:** seekers see their active request and what's coming up; donors see requests waiting for them and a "you can donate again" nudge; hospitals see verification work.

**For donors**
- **Contact preferences** (Profile → *Contact preferences*): *Emergencies only* (no Normal requests) and *Quiet hours* (only Critical requests get through). You stay in the donor pool; later search rounds can still reach you, and you can always answer requests in the app. Times are India time.
- **"You can donate again"** — one email per donation, plus a banner, when your gap is over.

**For hospital partners**
- **Verify several donors at once** (tick boxes, up to 25).
- **Edit or cancel your own camps** (new "Your camps" box on the Camps page).

Also: updated Privacy Policy and What's new list.

## Things to know
- **Nothing changes for existing requests.** Old requests behave exactly as before.
- Platelet and plasma requests use the **same waiting period between donations as whole blood** (the safer choice). The blood bank makes the final decision.
- Reminders and repeating-request emails use your project's existing Gmail email setup (free limits apply). If email isn't configured, everything else still works.
- Repeating requests are created when the server's timer runs **and** whenever the seeker opens *My Requests* — important because free hosting sleeps. An occurrence that came and went while the server slept is skipped, not created late.
- The old family-member "recurring care" reminder on the dashboard still exists separately.

## Honest limits
- **Not tested with a real MongoDB, real emails, or on a real phone.** Backend: 106 automated tests pass (25 new, covering matching rules, quiet hours, plan-ahead timing, repeating plans, permissions and the new hospital tools). Browser: 83 click-through checks pass (28 new) in a real headless browser with a fake server.
- The browser tests fill in coordinates by hand; the **"Use current location"** button itself (unchanged logic) isn't covered.
- Quiet hours are **IST only** — no per-user time zones yet.
- The test run caught one real bug in my first version of the new form (clicking *Next* also sent the request); it's fixed and now has a test.
- New Hindi strings are minimal and unreviewed.

## Apply (Windows 10, Command Prompt)
1. Stop both servers (`Ctrl+C`).
2. Extract `raktsetu-v1.9-full.zip`, then copy it over your project (change the paths to match yours; this keeps your `.env` files and `node_modules`):
   `xcopy /E /Y "C:\Users\YOU\Downloads\raktsetu-v1.9-full\*" "C:\Users\YOU\Downloads\raktsetu\"`
3. Start again (`start-raktsetu.bat`, or `npm run dev` in `backend` and in `frontend`) and hard-refresh with `Ctrl+Shift+R`.
   No database steps: the new `recurringplans` collection is created automatically.

## How to test (6 minutes)
1. **New request:** New Request → Next without choosing a blood group (you get a clear message) → choose B+ → pick *Platelets* → Next → fill hospital/area → *Use current location* → Next → review → Submit.
2. **Plan ahead:** New Request → on step 2 choose *Plan ahead* → pick a date a few days away → submit. The request page says "Planned for …" and My Requests shows **Scheduled**. Choose *Critical* and notice plan-ahead switches off.
3. **Repeat:** same, but switch on *Repeat this request* (needs a verified email) → submit → open My Requests → *Repeating requests* appears; try *Skip next* and the switch.
4. **Accept:** with a donor account accept a request; the seeker now sees **Call** and **WhatsApp** buttons.
5. **Donor preferences:** Profile → *Contact preferences* → turn on *Emergencies only* and *Quiet hours* → Save.
6. **Hospital:** (approved hospital) Verify page → search donors → *Select all not yet verified* → *Verify selected*. Camps page → *Your camps* → Edit / Cancel.
7. *(Optional)* `cd C:\Users\YOU\Downloads\raktsetu\frontend\e2e && npm test` — now 83 checks.

## Git
`cd C:\Users\YOU\Downloads\raktsetu && git add . && git commit -m "v1.9: guided request form, plan-ahead and repeating requests, platelets and plasma, donor preferences, hospital bulk tools" && git push`
