# RaktSetu v2.1c — My impact, share pictures, opt-in badges (final part of v2.1)

Full-sync zip. It contains everything: Glass Lab look (v2.0.1), help chat + invite links (v2.1a), camp RSVPs + stock board (v2.1b), and this part.
No new npm packages (the QR library was already installed). Restart the backend.

## What's new
1. **My impact** (new page, donors only, menu item "My Impact"): your donation count, most recent donation, when you can donate again, "people you may have helped" (up to 3 per donation, with a note that this is a commonly cited estimate), donations by year, and your full history (yours and your family members').
2. **"I donated" picture.** Make a 1080x1350 picture for WhatsApp/Instagram. Name, blood group and date are your choice (name empty and blood group off by default). On a phone it opens the share sheet; on a computer it downloads. Made on your device, never uploaded.
3. **Request poster.** On a request's page, "Make a poster": blood group, units, hospital, area, "needed by", and a QR code to the live status link. It never has a phone number or a patient's name.
4. **Badges and streaks — opt-in.** Off until you switch them on in My impact (a real "yes", saved on your account).
   - Badges: First drop (1 donation), Regular donor (3), Committed (5), Ten times over (10), Legend (25), Bridge builder (a friend you invited donated).
   - Streak: counts donations made within about 6 months of each other. The screen says: donate only when eligible, never to keep a streak. Nothing rewards donating early.
   - Private to you. They only appear on your public card if you ALSO switch on "My badges" in the card's privacy settings — and then only badge names, no dates or streak numbers.
5. Privacy Policy and "What's new" updated.

## Not done (needs a person, not code)
- **Regional languages** (the last item on the v2.1 list). I did not add machine-made translations for Tamil, Bengali, etc. Medical and emergency wording must be checked by native speakers. Tell me which languages you want and who can review them, and I'll build the language switch.

## Honest limits
- Tested with a headless browser (192 checks), 153 backend tests and 7 matcher tests. NOT tested with a real MongoDB, real Firebase or a real phone's share sheet. Pictures were checked by eye only in a desktop browser.
- Fonts in the pictures use whatever your device has (Inter is used if installed); on some phones the letters may look slightly different from my previews.
- "Up to 3 people per donation" is a common estimate, not a measured RaktSetu number.
- Badges count only donations recorded on your own donor profile; family members' donations don't count towards your badges.

## Apply (Windows, Command Prompt)
1. Extract the zip. Stop both servers (Ctrl+C).
2. Copy the extracted `frontend` and `backend` folders over your project folders, "replace all".
3. Start with `start-raktsetu.bat`, open http://localhost:5173 and press Ctrl+F5.

## How to test
- Log in as a donor with at least one recorded donation, open "My Impact": check the numbers, tap "Make my picture", type a name, tick/untick the options, download it.
- Turn "Badges and streaks" on; see badges and the streak note; turn off. Then My Card > Privacy: "My badges" is off by default; turn it on and open your public card link in a private window to see badge names only.
- Open one of your requests and tap "Make a poster"; scan the QR code with your phone.

## Git
git add . && git commit -m "v2.1c: my impact, share pictures, opt-in badges" && git push
