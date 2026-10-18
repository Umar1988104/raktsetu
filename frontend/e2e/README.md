# Browser smoke tests

These open the real app in a real browser (Edge/Chrome) and click through it. The server and
Firebase are faked, so nothing here touches your database or accounts. They exist so a change
can't silently break something (for example the login redirect bug).

```
cd frontend\e2e
npm install
npm test
```

- Needs Microsoft Edge or Google Chrome installed (Windows 10 already has Edge). If it can't find one:
  `set CHROME_PATH=C:\path\to\msedge.exe`
- Run only some tests: `node run.mjs login` (any file name part).
- The first run builds a test copy of the app into `e2e/.dist` (git-ignored).
- Backend tests are separate: `cd backend && node --test _tests/pure.test.js _tests/routes.test.js _tests/cards.test.js _tests/v18.test.js`

To add a test: create `tests/something.mjs` exporting `default async function ({ browser, newPage, fixtures, ok, sleep, BASE })`.
Use `fixtures(role, { guest, approved, admin, available, hidden })` for the fake API, and override
single endpoints with `fx["GET /api/…"] = {…}`. `flags` (e.g. `{ __unverified: "1" }`) set the fake login state.
