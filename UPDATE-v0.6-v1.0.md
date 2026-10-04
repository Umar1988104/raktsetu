# v0.6 + v1.0: verification tiers + hospital/blood-bank partner accounts

## What this adds
- A new account type: **hospital partner accounts** (sign up and pick "Hospital /
  blood bank partner", enter the hospital's exact name).
- **Critical-urgency requests are now held back** from contacting donors until
  the named hospital verifies them from their own dashboard — prevents anyone
  from marking a request "Critical" to jump the queue with no check.
- Hospital accounts get a **Verify Requests** page: see pending Critical requests
  under their name, click to verify (which immediately releases it to the
  matching engine, same as a normal request), and search + verify donors (the
  "Verified" badge you've seen all along is now real).
- Seekers see a clear "Awaiting hospital verification" banner on Critical
  requests until that happens, and can't manually skip past it.

## How to apply
1. Stop both servers (Ctrl+C in each window).
2. Unzip `raktsetu-v0.6-v1.0.zip`.
3. Copy its `backend` folder into your real `raktsetu\backend`, overwrite when asked.
4. Copy its `frontend` folder into your real `raktsetu\frontend`, overwrite when asked.
5. No new packages — no `npm install` needed this time.

## How to test it
1. Sign up a new account, choose **Hospital / blood bank partner**, and enter a
   hospital name — e.g. `AIIMS Delhi`. Remember this exactly.
2. As a seeker, create a new request, set Hospital to `AIIMS Delhi` (must match
   exactly, case doesn't matter) and Urgency to **Critical**. Submit it.
3. Open the request's status page — you should see the "Awaiting hospital
   verification" banner, and no donors get contacted yet.
4. Log in as the hospital account, go to **Verify Requests** — the request
   should appear. Click "Verify & notify donors".
5. Go back to the seeker's request page — it should now show "Contacted" and
   matched donors, exactly like a normal request.

## Push to GitHub
```
git add . && git commit -m "v0.6+v1.0: hospital partner accounts, Critical request verification, donor verification" && git push
```
