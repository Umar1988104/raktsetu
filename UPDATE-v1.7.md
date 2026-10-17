# RaktSetu v1.7 — The RaktSetu Card

Includes everything from v1.6 and the login fix, so this one zip is all you need.

## What's new
- **Every account gets a member card** with your blood group, trust badge (New = matte, Trusted = gradient, Pillar = shimmer), Verified mark, member-since, a unique ID like `RS-7K4M-9QX2` and a QR code.
- **Back of the card:** donation "stamps" (from your real donation history), next eligible date, and an optional emergency contact.
- **Family wallet:** each family member has their own card. They stack like Apple Wallet — tap one to lift it out, tap again to flip it in 3D.
- **QR → public verify page** (`/card/…`): shows only what *you* allow. Default: first name + initial, blood group, badge, Verified. For family members the name is OFF by default. You can also add "member since (year)" and a yes/no "eligible to donate today".
- **You're in control:** hide the card completely, or create a new ID/QR if it was shared by mistake (the old one stops working at once).
- **Download as an image** (made on your device, nothing uploaded). **Copy link / Share.**
- **Hospitals** can look a donor up by card ID (more private than phone), on the Verify page.
- **Hospital partner cards** say "Verified Partner" only after an **admin** has switched that on in the new *Hospital partners* box on the Admin page. Until then the public page says "Not verified by RaktSetu".
- Guests don't get a card (they're nudged to create an account).
- Privacy Policy and What's new updated.

## Privacy, in short
The public page never shows phone, email, address, photo, emergency contact, exact dates or anyone else's name. Wrong, hidden and unknown IDs all give the same "not found". Repeated wrong guesses from one device are blocked for a few minutes. The page is marked "do not index" for search engines. The emergency contact is printed only on your own card and downloaded image.

## Honest limits
- **Not tested with a real MongoDB, real Firebase login, or on a real phone.** Backend: 57 automated tests pass (25 new, including leak, rate-limit and typo-detection tests, using a fake database). Frontend: click-tested in a real headless Chromium (desktop and 390px phone), including flip, stack, privacy sheet, public page, image download, hospital lookup and the admin switch.
- Anyone can still register a *hospital* account with any name (this was already true). v1.7 only stops the card from claiming "Verified Partner" for them. Using the same admin flag to gate hospital powers is a recommended next fix.
- Rate limiting is in memory: it resets if the free server restarts or sleeps. It's a guard against casual guessing; the real protection is the random, unguessable ID.
- Cards are created the first time someone opens **My Card** (not at sign-up). Family members get theirs when you next open My Card.
- A donor who hides their card can still be found by name/phone, but not by card ID.
- New Hindi strings are minimal ("My Card"); the rest of the card screens are English only for now.

## Apply (Windows 10, Command Prompt)
1. Stop both servers (`Ctrl+C`).
2. Extract `raktsetu-v1.7-full.zip`, then copy it over your project (change the paths to match yours). This keeps your `.env` files and `node_modules`:
   `xcopy /E /Y "C:\Users\YOU\Downloads\raktsetu-v1.7-full\*" "C:\Users\YOU\Downloads\raktsetu\"`
3. Install the new package (and `motion` too, if you haven't yet):
   `cd C:\Users\YOU\Downloads\raktsetu\frontend && npm install qrcode motion`
4. Start again (`start-raktsetu.bat`, or `npm run dev` in `backend` and in `frontend`). Hard-refresh with `Ctrl+Shift+R`.
   No database steps are needed — the new `cards` collection is created automatically.

## How to test (3 minutes)
1. Click **My Card** in the menu. Your card appears with a QR code. Tap it to flip.
2. If you have family members, tap a card in the stack to lift it out.
3. **Privacy** → switch something off → the "Scanning the QR code shows" line updates.
4. **Copy link**, open it in a private/incognito window: you see the public page (no login).
5. **Download image** → a PNG with front and back.
6. In Privacy → **Create a new card ID** → open the old link again: "Card not available".
7. Admin account: Admin page → **Hospital partners** → switch a hospital to verified.
8. Hospital account: Verify page → look up a donor by card ID.

## Git
`cd C:\Users\YOU\Downloads\raktsetu && git add . && git commit -m "v1.7: RaktSetu member card with QR and public verify page" && git push`
