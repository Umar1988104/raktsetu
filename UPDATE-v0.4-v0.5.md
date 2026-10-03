# v0.4 + v0.5: real accept/decline, automatic status, email alerts

## What this adds
- The moment a seeker creates a request, up to 10 compatible/available/nearby
  donors are automatically found and notified (email, since push isn't set up yet —
  see note below).
- Donors see these as real, actionable items on their **Notifications** page, with
  Accept/Decline buttons.
- Accepting auto-moves the request to "Confirmed" — no manual click needed.
- Marking a request "Fulfilled" automatically logs a donation-history entry for
  every donor who accepted (shows up on their Profile → Donation History tab).
- Seekers see a live feed on their own Notifications page of every donor response.

## About push notifications
Real push (so a donor gets notified even with the site closed) needs a Firebase
"VAPID key" plus a service worker file — genuinely one of the fiddlier web setups,
similar in spirit to today's DNS troubleshooting but for push. I've deliberately
NOT built that part yet so this update stays something you can apply in 10 minutes.
**Email is the live notification channel right now.** Say the word whenever you want
push properly wired in — it's a clean follow-up, not a rewrite.

## 1. One-time setup: Gmail for sending emails
1. Use a Gmail account (a new one just for this project is fine, so your main
   inbox isn't involved).
2. Go to myaccount.google.com/security → turn on **2-Step Verification** if it's
   not already on (required for the next step).
3. Go to myaccount.google.com/apppasswords → create an app password, name it
   "raktsetu" → it shows you a 16-character password. Copy it.
4. Open `backend\.env` and add two new lines at the end:
   ```
   GMAIL_USER=youraddress@gmail.com
   GMAIL_APP_PASSWORD=the16characterpassword
   ```
   (no spaces, no quotes)

## 2. Apply the code update
1. Stop both servers (Ctrl+C in each window).
2. Unzip `raktsetu-v0.4-v0.5.zip`.
3. Copy its `backend` folder into your real `raktsetu\backend`, overwrite when asked.
4. Copy its `frontend` folder into your real `raktsetu\frontend`, overwrite when asked.
5. No new frontend packages needed. Backend has one new package — in Command Prompt:
   `cd backend && npm install`

## 3. Run and test
```
cd backend && npm run dev
```
```
cd frontend && npm run dev
```

To actually see this work, you need at least one donor account with a matching
blood group, "Available" turned on, and a saved location — then create a request
as a seeker. Check that donor's email inbox (and spam folder) for the alert, or
just log in as that donor and check their Notifications page directly.

## 4. Push to GitHub
```
git add . && git commit -m "v0.4+v0.5: accept/decline, auto status, email alerts" && git push
```
