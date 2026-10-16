# RaktSetu v1.6 — Design system & iOS-style motion

Frontend-only update. The backend is unchanged (it is still in the zip so the sync is complete).

## What's new
- **Calm look:** deep-teal brand colour. Red is now used only for urgent things: SOS, Critical, errors and destructive buttons.
- **New logo:** a blood drop resting on a bridge ("Setu"). The bridge shape is reused in the landing hero, the loading animation and section dividers.
- **Dark mode, high-contrast mode and text size:** tap the sun/moon icon at the top (Appearance). Saved on your device only.
- **iOS-style feel:** springy page transitions, a menu highlight that slides between links, bottom sheets on phones (drag down to close), frosted top bar, big page titles that shrink into the top bar as you scroll, swipe-to-dismiss notifications.
- **Switches and segmented controls:** availability is an iOS switch (changes instantly; if the server refuses, it flips back and tells you why). My Requests tabs, language, theme, role picker and the eligibility Yes/No questions are segmented controls.
- **Confirmations are action sheets** (log out, remove family member, close request, report fake). Destructive ones are red.
- **8-point spacing grid, safe-area padding for notched phones, aligned numbers** in stats.
- **Faster first load:** each page is a separate small download. First load went from ~998 KB to ~400 KB.
- Hindi strings added for the new Appearance sheet; Privacy Policy and What's new updated.

## Login fix (included)
Fixed: after logging in you were sent to "Tell us a bit about you" even though your account already existed ("Profile already exists"). Cause: the app moved to the dashboard before your profile had finished loading, and the page guard mistook that for "no profile". Now login waits for the profile, a slow or failed server reply is retried (and shows a "Try again" screen instead of the sign-up form), and a registered user who lands on that page is sent straight to the dashboard.

## Honest limits
- **Not tested on a real phone or a low-end Android.** I tested in a real headless Chromium (desktop + 390px phone size, light/dark/high-contrast, reduced-motion) — 22 click-through checks passed. Please try it on your phone and tell me if anything feels slow; the frosted blur is the first thing I'd turn off.
- Not testable here: real Firebase login, real MongoDB, real emails. Nothing in those areas changed.
- The new Hindi strings need a native speaker's review.
- Availability ON switches instantly, *before* the server confirms (that is the "optimistic" part). If the server refuses (for example during the donation gap) it rolls back with an error message.
- Old browsers (before 2022) may show a plain (non-frosted, non-animated) version.

## Apply (Windows 10, Command Prompt)
1. Download and extract `raktsetu-v1.6-full.zip` (right-click → Extract All). You get a `backend` and a `frontend` folder.
2. Stop the running servers (press `Ctrl+C` in both windows).
3. Copy the extracted files over your project (replace `YOU` and the folder names to match yours). This keeps your `.env` files and `node_modules`:
   `xcopy /E /Y "C:\Users\YOU\Downloads\raktsetu-v1.6-full\*" "C:\Users\YOU\Downloads\raktsetu\"`
4. Install the one new package:
   `cd C:\Users\YOU\Downloads\raktsetu\frontend && npm install motion`
5. Start again (`start-raktsetu.bat`, or `npm run dev` in `backend` and in `frontend`). Hard-refresh the browser (`Ctrl+Shift+R`).

## How to test (2 minutes)
1. Tap the sun/moon icon → pick **Dark** → refresh: it stays dark.
2. Resize the window narrow (or open on your phone): the menu slides in; the Appearance sheet slides up from the bottom.
3. Profile (donor): flip **Available to donate** off — it changes instantly. Flip on — eligibility sheet appears.
4. Click **Log out**: an action sheet asks first.
5. My Requests: switch Active / History.
6. Scroll any page: the big title shrinks into the top bar.

## Git
`cd C:\Users\YOU\Downloads\raktsetu && git add . && git commit -m "v1.6: design system, dark mode, iOS-style motion" && git push`
