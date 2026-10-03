# Updating your project to v0.3

This adds: the real matching engine (compatibility + distance ranking with a map),
the status stepper on requests, and a full visual redesign.

## How to apply this update

1. Close both running servers (Ctrl+C in each window).
2. Unzip `raktsetu-v0.3-update.zip` — it contains only the files that changed.
3. Copy its `backend` folder contents into your existing `raktsetu\backend`, overwriting
   when asked (your `.env` is NOT in this zip, so it will not be touched).
4. Copy its `frontend` folder contents into your existing `raktsetu\frontend`,
   overwriting when asked (your `frontend\.env` is also not included/touched).
5. New backend dependency: none — no extra `npm install` needed for backend.
6. New frontend dependency: `leaflet` and `react-leaflet` were already installed back
   in v0.1, so no extra `npm install` needed for frontend either. If you get an error
   about `leaflet` not found, run: `cd frontend && npm install`

## Then just run it like before

```
cd backend && npm run dev
```
```
cd frontend && npm run dev
```

## What to try
- Sign in as the seeker, open an existing request, click "Find matches" — you'll see
  a ranked list of compatible, available donors with real distances, plus a map.
- If nothing shows up, make sure at least one donor account has a matching/compatible
  blood group, is marked "Available", and has saved a location.
