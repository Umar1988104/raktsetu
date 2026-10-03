# Applying the BloodLink-style redesign + v0.3 matching engine

## 1. Apply the update
1. Close both running servers (Ctrl+C in each window).
2. Unzip `raktsetu-ui-redesign.zip`.
3. Copy its `backend` folder contents into your `raktsetu\backend`, overwriting when asked.
4. Copy its `frontend` folder contents into your `raktsetu\frontend`, overwriting when asked.
5. Delete these old files if they're still in your `frontend\src` folder (they're no longer used,
   replaced by the new pages) — safe to delete, nothing imports them anymore:
   - `src/pages/Home.jsx`
   - `src/pages/DonorDashboard.jsx`
   - `src/pages/SeekerDashboard.jsx`
   - `src/components/Navbar.jsx`
   - `src/components/StatusStepper.jsx`
   - `src/components/MatchesPanel.jsx`
6. No new `npm install` needed — `lucide-react` and `recharts` are in `package.json` already
   from this update, but if you get a "module not found" error, run:
   `cd frontend && npm install`

## 2. Run it like before
```
cd backend && npm run dev
```
```
cd frontend && npm run dev
```

## 3. Push everything to GitHub (first time)

If you haven't created the GitHub repo yet, make an empty one first (e.g. named `raktsetu`),
then from your `raktsetu` folder in Command Prompt:

```
git init && git add . && git commit -m "v0.3: matching engine + BloodLink-style redesign" && git branch -M main && git remote add origin https://github.com/<your-username>/raktsetu.git && git push -u origin main
```

Replace `<your-username>` with your actual GitHub username.

### If you already pushed before (just update it)
```
git add . && git commit -m "v0.3: matching engine + BloodLink-style redesign" && git push
```

Your `.env` files are git-ignored, so none of your secrets (Mongo password, Firebase key) ever
get uploaded — you can safely push as often as you like.
