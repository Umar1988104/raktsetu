// Real release history of this project, newest first. Versions only — no
// invented dates. Edit freely as you ship more.
export const CHANGELOG = [
  {
    version: "v2.1d",
    date: "2026-10-26",
    title: "Welcome tour and a fix",
    items: [
      "New quick tour: new people see what each feature does, and returning people see what is new — just Skip or Next",
      "Fixed: My requests showed a blank screen when you had no active requests",
      "If a page ever has a problem, you now see a helpful message and the menu keeps working, instead of a blank screen",
    ],
  },
  {
    version: "v2.1c",
    date: "2026-10-26",
    title: "My impact, share pictures and badges",
    items: [
      "New My impact page: your donations, a year-by-year chart and how many people you may have helped",
      "Make an “I donated” picture to share (you choose what is on it) and a poster for a blood request with a QR code",
      "Optional badges and streaks — off until you turn them on, and never on your public card unless you choose",
    ],
  },
  {
    version: "v2.1b",
    date: "2026-10-25",
    title: "Camp RSVPs and blood stock",
    items: [
      "Donation camps: tap “I’ll come” and get an email reminder the day before; hospitals see how many are coming, never who",
      "New Blood stock page: see what hospital blood banks hold, always with when it was updated and a “call to confirm” notice",
      "Approved hospitals can post and update their own stock board",
    ],
  },
  {
    version: "v2.1a",
    date: "2026-10-25",
    title: "Help chat and invite links",
    items: [
      "New Help button: ask a question and get a pre-written answer, in English or Hindi (not AI, and your questions stay on your device)",
      "Invite friends: share your link; when a friend you invited donates, your trust score grows",
      "Your card can optionally show how many invited friends have donated (off unless you turn it on)",
    ],
  },
  {
    version: "v2.0.1",
    date: "2026-10-24",
    title: "A new look",
    items: [
      "A brand-new look: frosted glass panels over a softly lit backdrop, with red kept for emergencies",
      "New blood-vial tabs: pick a view and its test tube fills with blood",
      "A live heartbeat panel on your dashboard, and a cursor-following shine on glass cards",
      "Clicking the RaktSetu logo now always takes you to the home page — from the dashboard, log in, sign up and more",
      "When you are logged in, the home page shows “Open dashboard” so you can jump straight back",
    ],
  },
  {
    version: "v2.0",
    date: "2026-10-22",
    title: "Live experience & visuals",
    items: [
      "The home page now shows a donor and a patient joined by the bridge, with a pulse crossing it — plus short stories for families, donors and hospitals, and an FAQ",
      "Every request has a journey view: created, donors notified, search widened, accepted, fulfilled — with the real times",
      "The request page refreshes itself, and a calm thank-you appears when your request is fulfilled",
      "A better map: a search-radius circle, pins coloured by distance, and nearby pins merged into numbered bubbles",
      "A setup checklist with a progress ring; friendly illustrations on empty screens and a proper “page not found”",
      "New on the Impact page: where blood is being requested (private, only larger areas) and who can give to whom",
      "Notifications grouped by day with urgent ones first, swipe to dismiss; pull down to refresh and swipe in from the edge to open the menu on a phone",
    ],
  },
  {
    version: "v1.9",
    date: "2026-10-20",
    title: "Smarter requests & donor tools",
    items: [
      "A simpler, step-by-step request form with big blood-group buttons",
      "Plan ahead: ask for blood for a date up to 30 days away — donors are contacted about 3 days before",
      "Repeating requests for regular transfusions, created for you automatically",
      "Request platelets or plasma, not just blood",
      "Call and WhatsApp buttons once someone accepts",
      "Donors can set quiet hours or “emergencies only”, and get a nudge when they can donate again",
      "Hospital partners can verify several donors at once and edit or cancel their camps",
      "Your dashboard now puts what matters for your role first",
    ],
  },
  {
    version: "v1.8",
    date: "2026-10-17",
    title: "Trust & safety",
    items: [
      "Hospital tools now unlock only after an admin approves the hospital",
      "Email verification: needed to donate, accept requests or act as a hospital (raising a request never needs it)",
      "Guests can save their account with an email and password and keep their requests",
      "Donors can stay off the map and still be matched; “self-declared” notes on blood group",
      "Server protection against spam and password guessing; updated Privacy Policy",
      "Admins get an action log and an anonymous statistics download",
    ],
  },
  {
    version: "v1.7",
    date: "2026-10-17",
    title: "The RaktSetu Card",
    items: [
      "Every account gets a member card with a QR code: your blood group, trust badge, Verified mark and donation stamps",
      "Family members get their own cards; they stack like a wallet — tap one to lift it out, tap again to flip it",
      "You choose what the QR page shows (default: first name, blood group, badge, Verified). Hide the card or create a new ID any time",
      "Download your card as an image; optional emergency contact is printed on the back only",
      "Hospitals can look a donor up by card ID instead of phone number",
      "Hospital partner cards say “Verified Partner” only after an admin has checked the hospital",
    ],
  },
  {
    version: "v1.6",
    date: "2026-10-16",
    title: "Calmer design & smoother feel",
    items: [
      "New look: a calm deep-teal brand colour, with red kept only for urgent things (SOS, Critical, errors)",
      "New RaktSetu logo — a blood drop resting on a bridge",
      "Dark mode, high-contrast mode and a text-size setting (tap the sun/moon icon)",
      "iOS-style motion: springy page transitions, sliding menu highlight, bottom sheets and swipe-to-dismiss notifications",
      "Availability is now a switch that responds instantly, and rolls back if it can't be saved",
      "Pages load faster: the app is split into smaller pieces that download as you need them",
    ],
  },
  {
    version: "v1.5",
    title: "Privacy hardening, request lifecycle & impact metrics",
    items: [
      "Donor and requester contact details are now shared only after a donor accepts",
      "Requests time out automatically, with a \"Still need blood?\" prompt before they close",
      "If nobody accepts in time, the search widens and notifies more donors",
      "Admin moderation page, public Impact page, and a labelled demo-data tool",
    ],
  },
  {
    version: "v1.4.1",
    title: "Richer dashboard & safer logout",
    items: [
      "Dashboard now shows live activity, quick actions, upcoming camps, updates and tips",
      "Logging out asks for confirmation (with a stronger warning for guest sessions)",
      "Donation gap corrected: 3 months for men, 4 months for women (longer gap used if not specified)",
    ],
  },
  {
    version: "v1.4",
    title: "Real-world bridges",
    items: [
      "Share a live, privacy-safe tracking link on WhatsApp",
      "Hindi / English toggle",
      "Printable donation acknowledgement, post-donation care tip, thank-you notes",
      "One-tap 112 / 108 call buttons on emergency screens",
    ],
  },
  {
    version: "v1.3",
    title: "Sahyog Mode (accessibility)",
    items: [
      "Voice input and read-aloud",
      "SOS shortcut and accessible camp locator",
      "Recurring-transfusion reminders for family members",
    ],
  },
  {
    version: "v1.2",
    title: "Guest access & trust",
    items: [
      "Emergency request without an account, with anti-spam limits",
      "Report-as-fake by donors",
      "Verified hospital partners shown on the home page",
    ],
  },
  {
    version: "v1.1",
    title: "Trust, privacy & eligibility",
    items: [
      "Trust tiers (New / Trusted / Pillar)",
      "Privacy policy and masked phone numbers",
      "Donation cooldown and eligibility questionnaire",
    ],
  },
  {
    version: "v1.0.1",
    title: "Family accounts & profile editing",
    items: [
      "One login can manage family members and their donor profiles",
      "Profile photo, address, validated phone numbers",
    ],
  },
  {
    version: "v1.0",
    title: "Hospital partners & verification",
    items: [
      "Hospital / blood-bank partner accounts",
      "Critical requests held until the named hospital verifies them",
    ],
  },
  { version: "v0.5", title: "Automatic status tracking", items: ["Status moves automatically as donors accept", "Donation history logged on fulfilment"] },
  { version: "v0.4", title: "Accept / decline", items: ["Matched donors are alerted and can accept or decline"] },
  { version: "v0.3", title: "Matching engine", items: ["Blood-group compatibility and distance ranking with a map"] },
  { version: "v0.2", title: "Requests & browsing", items: ["Create requests and browse donors"] },
  { version: "v0.1", title: "Registration", items: ["Donor and seeker sign-up"] },
];
