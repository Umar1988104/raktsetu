// Real release history of this project, newest first. Versions only — no
// invented dates. Edit freely as you ship more.
export const CHANGELOG = [
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
