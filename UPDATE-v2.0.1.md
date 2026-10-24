# RaktSetu v2.0.1 — "Glass Lab" look + logo goes home

Frontend only. No backend change, no new packages, no database change.

## What changed
- New look: frosted glass panels over a softly lit backdrop, iOS-style system colours, ink buttons.
- Red is only for emergencies: SOS buttons, Critical requests, urgent badges and the blood in the tabs.
- New "Choose a view" tabs: colour-capped test tubes, the selected one fills with blood (Landing page "Who it's for" and My requests).
- Dashboard: "Live now" panel with a scrolling heartbeat line and pulsing donor dots.
- Glass cards get a soft light that follows your mouse (desktop only).
- New logo (red glossy tile with the drop) and a recoloured night-time bridge scene on the home page.
- Clicking the RaktSetu logo opens the public home page (/) from the dashboard, log in, sign up, card page and 404 page.
- When logged in, the home page shows "Open dashboard" instead of Log in / Get started.
- Dark mode, high-contrast, large text and reduced motion all still work. With "reduce motion" the heartbeat and glows stand still; with "reduce transparency" or high contrast the glass becomes solid.

## Honest limits
- Checked in a headless browser only (121 checks pass), not on a real phone or with a real GPU.
- Blur is used only on the top bar, menu, home-page header and sheets, to keep it light on older PCs.
- Fonts: Inter is loaded from Google Fonts (Apple devices use their own system font).
- Log out still goes to the log in page. Use the logo to reach the home page.

## Apply (Windows)
1. Extract the zip. Stop both servers (Ctrl+C).
2. Copy the extracted `frontend` and `backend` folders over your project folders, "replace all".
3. Start again with `start-raktsetu.bat`, open http://localhost:5173 and press Ctrl+F5.
4. Test: home page, log in, click the logo, My requests tabs, dark mode button.

## Git
git add . && git commit -m "v2.0.1: Glass Lab look, vial tabs, logo links to home" && git push
