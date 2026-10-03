# RaktSetu — Smart Blood Donation (v0.2)

Team RaktSetu · SIH26198 · Team ID TID335

This build covers:
- **v0.1** — donor & seeker registration (Firebase Auth + MongoDB profiles)
- **v0.2** — blood request creation + manual donor browsing/filtering

No matching engine, notifications, or status auto-tracking yet — that's v0.3–v0.6.

---

## 0. What you need to create (both free, no card required)

### A. A Firebase project (for login/signup)
1. Go to https://console.firebase.google.com → **Add project** → name it `raktsetu` (or anything) → finish the wizard.
2. In the left sidebar: **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. Click the gear icon → **Project settings → General**. Under "Your apps", click the **</> (Web)** icon to register a web app. Copy the `firebaseConfig` values shown — you'll paste these into `frontend/.env`.
4. Still in Project settings, go to the **Service accounts** tab → **Generate new private key**. This downloads a `serviceAccountKey.json` file — you'll need its contents for `backend/.env`.

### B. A MongoDB Atlas cluster (free M0)
1. Go to https://www.mongodb.com/cloud/atlas/register → create a free account.
2. Create a new project → **Build a Database → M0 (Free)** → choose any region close to India → create.
3. Under **Database Access**, add a database user with a username/password (save these).
4. Under **Network Access**, add IP `0.0.0.0/0` (allow from anywhere) — fine for a hackathon build.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`

---

## 1. First-time setup (do this once)

Open Command Prompt in the folder where you unzipped this project.

```
cd backend && copy .env.example .env && cd ..\frontend && copy .env.example .env && cd ..
```

Now open `backend\.env` in a text editor and fill in:
- `MONGODB_URI` — your Atlas connection string from step B (add `/raktsetu` before the `?` so it targets a database named `raktsetu`)
- `FIREBASE_SERVICE_ACCOUNT_JSON` — open the downloaded `serviceAccountKey.json`, and paste its **entire contents as one line** here

Open `frontend\.env` and fill in the six `VITE_FIREBASE_...` values from step A.3.

Then install dependencies for both:

```
cd backend && npm install && cd ..\frontend && npm install && cd ..
```

---

## 2. Run it locally

Open **two** Command Prompt windows.

**Window 1 — backend:**
```
cd backend && npm run dev
```
You should see `Connected to MongoDB Atlas` and `RaktSetu backend running on port 5000`.

**Window 2 — frontend:**
```
cd frontend && npm run dev
```
Open the URL it prints (usually `http://localhost:5173`).

Try it: sign up as a seeker, sign up as a donor (in a second browser or incognito tab), fill in the donor profile, then from the seeker dashboard search for that donor's blood group.

---

## 3. Push this to your GitHub repo

If you haven't made a repo yet: create one on GitHub first (e.g. `raktsetu`), then:

```
git init && git add . && git commit -m "v0.2: registration, requests, manual donor browsing" && git branch -M main && git remote add origin https://github.com/<your-username>/raktsetu.git && git push -u origin main
```

For every future update after this one, use:

```
git add . && git commit -m "describe what changed" && git push
```

(`.env` files are already git-ignored, so your secrets never get pushed.)

---

## 4. Deploy (both free)

### Backend → Render
1. https://render.com → **New → Web Service** → connect your GitHub repo → set **Root Directory** to `backend`.
2. Build command: `npm install` · Start command: `npm start`.
3. Under **Environment**, add the same three variables from `backend\.env` (`MONGODB_URI`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `CORS_ORIGIN` — set `CORS_ORIGIN` to your Vercel URL once you have it, e.g. `https://raktsetu.vercel.app`).
4. Deploy. Copy the `.onrender.com` URL it gives you.
   - Note: on Render's free tier the service sleeps after 15 min idle and takes ~30–50s to wake on the next request — normal for the free tier, not a bug.

### Frontend → Vercel
1. https://vercel.com → **Add New → Project** → import the same repo → set **Root Directory** to `frontend`.
2. Add the six `VITE_FIREBASE_...` env vars plus `VITE_API_BASE_URL` (your Render URL from above) under **Environment Variables**.
3. Deploy. Vercel gives you a live `.vercel.app` link.
4. Go back to Firebase Console → Authentication → Settings → **Authorized domains** → add your `.vercel.app` domain, or sign-in will be blocked.

---

## What's next (later sessions)
- **v0.3** — automatic compatibility + distance + availability matching (Leaflet/OpenStreetMap)
- **v0.4** — push notifications (Firebase Cloud Messaging) with accept/decline
- **v0.5** — live status pipeline (Searching → Contacted → Confirmed → Fulfilled)
- **v0.6** — verification tiers + mandatory hospital verification for Critical requests
