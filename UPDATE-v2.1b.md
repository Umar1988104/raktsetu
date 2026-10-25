# RaktSetu v2.1b — Camp RSVPs + reminders, Blood stock board

Full-sync zip. It includes everything from v2.0.1 (Glass Lab look) and v2.1a (help chat, invite links).
No new npm packages. Restart the backend (two new database collections are created automatically).

## What's new
1. **Camp RSVPs.** On the Donation camps page, logged-in donors and seekers get an "I'll come" button (tap again to cancel).
   - One email reminder is sent the day before (within 24 hours of the camp). It is claimed before sending, so nobody gets it twice.
   - If a hospital moves the camp to another day, reminders are re-armed. If the camp is deleted, its RSVPs are deleted.
   - Hospitals see only a **count** ("7 people are going") in "Your camps" — never names.
   - Guests, hospitals and people with an unverified email cannot RSVP; a cap of 30 new RSVPs per month stops spam.
2. **Blood stock board** (new page "Blood Stock", public, also in the menu).
   - Approved hospital partners type in units for all 8 blood groups, plus address, area and map location (first time).
   - Every board shows "Updated 3h ago"; after 48 hours it also says "May be out of date". A "call the blood bank to confirm before you travel" notice is always visible.
   - Visitors can filter by blood group (only boards with at least 1 unit) and search by area. A Directions link opens the map.
   - Levels are words as well as colours: None (0), Low (1–4), Available (5+).
   - Nothing about donors or patients is shown; the public data has no account ids.
3. Privacy Policy and "What's new" updated.
4. Also: the area search on the camps list now escapes special characters (safer).

## Honest limits
- Tested with a headless browser (171 checks), 142 backend tests and 7 matcher tests. NOT tested with a real MongoDB, real emails or a real phone.
- Reminder emails use the same Gmail setup as the "donate again" emails (free limits apply). Reminders are checked by the background timer once an hour; if your free host sleeps, they go out when the server next wakes.
- "Low = 1–4 units" is a simple rule I chose; tell me if blood banks use another one.
- Stock numbers are typed by hand; there is no automatic link to any hospital system.
- Demo data (seed-demo) has no stock boards or RSVPs; post one with an approved hospital account.

## Apply (Windows, Command Prompt)
1. Extract the zip. Stop both servers (Ctrl+C).
2. Copy the extracted `frontend` and `backend` folders over your project folders, "replace all".
3. Start with `start-raktsetu.bat`, open http://localhost:5173 and press Ctrl+F5.

## How to test
- RSVP: log in as a donor (verified email), open Donation camps, tap "I'll come", then tap again to cancel. As an approved hospital, post a camp for tomorrow, have a donor RSVP, and check "Your camps" shows "1 person is going".
- Stock: as an approved hospital open Blood Stock, fill the form, Save. Open the page in a private window: the board shows "Updated just now". Try the O- filter and the area search.

## Git
git add . && git commit -m "v2.1b: camp RSVPs and reminders, blood stock board" && git push
