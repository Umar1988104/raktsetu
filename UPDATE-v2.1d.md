# RaktSetu v2.1d — Fix for the blank "My requests" screen + welcome tour

Full-sync zip (everything from v2.0.1 to v2.1c is included). Frontend-only changes in this step; backend is unchanged. No new packages.

## The bug you reported
"My requests" went blank. Cause: when you had no active requests (or only finished ones), the page shows a "Create a request" button, and that button's code was missing its link import, so the whole screen crashed. Fixed. I added a test that opens My requests with no requests and with only finished ones; I checked that this test FAILS without the fix and passes with it. I also scanned the whole app for the same kind of mistake (an undefined name): none other found.

## Safety net (so a crash can never again look like a blank screen)
If any page crashes, you now see "Something went wrong on this page" with Reload / Go home buttons, and the menu keeps working. Picking another page from the menu clears the message.

## Welcome tour and What's new
- **New people** (account created in the last 3 days): "Welcome" tour — what each feature does. Different steps for donors (7), seekers (6) and hospitals (5).
- **Returning people:** "What's new" tour, once per release (donors 5 steps, seekers 4, hospitals 4). Existing users will see it once after this update.
- Exactly two buttons: **Skip** and **Next** (the last step says **Done**). Escape and swiping the sheet down count as Skip.
- In English or Hindi, following the language you chose.
- Remembered in the browser only (nothing goes to the server); not shown to quick (guest) accounts. You can replay it from the Profile page ("Show the tour again").
- Privacy Policy and "What's new" updated.

## Honest limits
- Because it is remembered per browser, someone who logs in on a new phone or clears their browser data will see the tour again.
- The Hindi tour text is new and should be checked by a native speaker.
- Tested with a headless browser (220 checks), 153 backend tests and 12 unit tests. Not tested on a real phone.
- To show "What's new" again in a future release, change TOUR_VERSION in frontend/src/data/tour.js and edit the WHATS_NEW steps.

## Apply (Windows, Command Prompt)
1. Extract the zip. Stop both servers (Ctrl+C).
2. Copy the extracted `frontend` and `backend` folders over your project folders, "replace all".
3. Start with `start-raktsetu.bat`, open http://localhost:5173 and press Ctrl+F5.

## How to test
- Log in with your account: the "What's new" tour appears once. Try Skip, then log in again: it does not come back.
- Profile > "Show the tour again" replays the Welcome tour.
- Open My requests with no active requests: you should see "No active requests." and a "Create a request" button.
- Create a brand-new test account: it should get the Welcome tour for its role.

## Git
git add . && git commit -m "v2.1d: fix blank My requests, error safety net, welcome and what's-new tours" && git push
