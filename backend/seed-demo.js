// Sample data so the app doesn't look empty — e.g. for a demo or judging day.
//
//   node seed-demo.js            add the sample data
//   node seed-demo.js --remove   delete exactly that sample data (nothing else)
//
// Everything it creates is flagged isDemo and visibly labelled: names start
// with "Demo", emails end in @example.invalid, and the placeholder phone
// numbers are not real, callable numbers. The app shows a "includes demo
// data" notice while any of it exists, so it can't pass for real usage.

require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // same Windows DNS workaround as server.js
const mongoose = require("mongoose");

const User = require("./models/User");
const Donor = require("./models/Donor");
const Request = require("./models/Request");
const Camp = require("./models/Camp");

const MIN = 60e3;
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const oid = () => new mongoose.Types.ObjectId();

const AREAS = [
  { area: "Saket, New Delhi", lat: 28.5245, lng: 77.2066 },
  { area: "Dwarka Sector 10, New Delhi", lat: 28.5823, lng: 77.05 },
  { area: "Rohini Sector 7, New Delhi", lat: 28.7495, lng: 77.0565 },
  { area: "Lajpat Nagar, New Delhi", lat: 28.5677, lng: 77.2433 },
  { area: "Karol Bagh, New Delhi", lat: 28.6519, lng: 77.1909 },
  { area: "Janakpuri, New Delhi", lat: 28.6219, lng: 77.0878 },
  { area: "Noida Sector 62", lat: 28.627, lng: 77.3649 },
  { area: "Gurugram Sector 29", lat: 28.4595, lng: 77.0266 },
];
const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Isha", "Vihaan", "Anaya", "Arjun", "Saanvi", "Reyansh", "Kiara", "Advait", "Myra"];
const LAST = ["Mehta", "Iyer", "Singh", "Nair", "Gupta", "Khan", "Das", "Reddy", "Verma", "Joshi", "Bose", "Kapoor", "Menon", "Shah"];
const GROUPS = ["O+", "A+", "B+", "O-", "AB+", "A-", "B-", "AB+", "O+", "A+", "B+", "O+", "AB-", "A+"];

// Pure: builds all the sample documents. (Exported so it can be tested.)
function buildDemoData(now = new Date()) {
  const at = (msAgo) => new Date(now.getTime() - msAgo);
  const pad = (n) => String(n).padStart(2, "0");

  // --- hospital partner + a seeker who "raised" the sample requests ---
  const hospitalUser = {
    _id: oid(), firebaseUid: "demo-uid-hospital", name: "Demo Hospital Desk", email: "demo.hospital@example.invalid",
    phone: "0000000100", role: "hospital", hospitalName: "Demo City Hospital", isGuest: false, isDemo: true,
    familyMembers: [], createdAt: at(30 * DAY), updatedAt: at(30 * DAY), __v: 0,
  };
  const seekerUser = {
    _id: oid(), firebaseUid: "demo-uid-seeker", name: "Demo Seeker", email: "demo.seeker@example.invalid",
    phone: "0000000101", role: "seeker", isGuest: false, isDemo: true,
    familyMembers: [], createdAt: at(30 * DAY), updatedAt: at(30 * DAY), __v: 0,
  };

  // --- donors ---
  const users = [hospitalUser, seekerUser];
  const donors = [];
  FIRST.forEach((first, i) => {
    const place = AREAS[i % AREAS.length];
    const jitter = ((i * 37) % 100) / 10000; // a few hundred metres, deterministic
    const user = {
      _id: oid(), firebaseUid: `demo-uid-donor-${pad(i + 1)}`, name: `Demo ${first} ${LAST[i]}`,
      email: `demo.donor${i + 1}@example.invalid`, phone: `00000002${pad(i + 1)}`, role: "donor",
      isGuest: false, isDemo: true, familyMembers: [], createdAt: at((40 - i) * DAY), updatedAt: at((40 - i) * DAY), __v: 0,
    };
    users.push(user);

    // Most have no recent donation; a couple donated ~3 weeks ago (so they're resting).
    const resting = i === 4 || i === 9;
    const history = resting
      ? [{ _id: oid(), date: at(20 * DAY), requestId: null }]
      : i % 4 === 0
      ? [{ _id: oid(), date: at(180 * DAY), requestId: null }, { _id: oid(), date: at(300 * DAY), requestId: null }]
      : [];

    donors.push({
      _id: oid(), user: user._id, familyMemberId: null, bloodGroup: GROUPS[i], area: place.area,
      sex: i % 3 === 0 ? "female" : i % 3 === 1 ? "male" : null,
      location: { type: "Point", coordinates: [place.lng + jitter, place.lat + jitter] },
      available: !resting && i % 6 !== 5, verified: i % 3 === 0, fcmTokens: [], donationHistory: history,
      isDemo: true, createdAt: user.createdAt, updatedAt: user.createdAt, __v: 0,
    });
  });

  // --- upcoming camps ---
  const camps = [
    { name: "Demo Community Blood Drive", days: 5, area: "Saket", a: { wheelchairRamp: true, groundFloor: true, accessibleParking: true } },
    { name: "Demo Campus Donation Camp", days: 12, area: "Dwarka", a: { wheelchairRamp: false, groundFloor: true, accessibleParking: false } },
    { name: "Demo Corporate Drive", days: 20, area: "Gurugram", a: { wheelchairRamp: true, groundFloor: false, accessibleParking: true } },
  ].map((c, i) => ({
    _id: oid(), hospital: hospitalUser._id, hospitalName: hospitalUser.hospitalName, name: c.name,
    date: new Date(now.getTime() + c.days * DAY), address: `Demo venue ${i + 1}`, area: c.area,
    location: { type: "Point", coordinates: [AREAS[i].lng, AREAS[i].lat] }, accessibility: c.a,
    isDemo: true, createdAt: at(2 * DAY), updatedAt: at(2 * DAY), __v: 0,
  }));

  // --- sample requests with realistic timings (these feed the Impact page) ---
  const loc = { type: "Point", coordinates: [AREAS[0].lng, AREAS[0].lat] };
  const mk = ({ urgency, ageMs, status, accept, closedReason, verified = false, decline }) => {
    const created = at(ageMs);
    const contacted = donors.slice(0, 3).map((d, k) => ({
      _id: oid(), donor: d._id, status: "Pending", notifiedAt: created,
    }));
    if (accept !== undefined) {
      contacted[0].status = "Accepted";
      contacted[0].respondedAt = new Date(created.getTime() + accept * MIN);
    }
    if (decline !== undefined) {
      contacted[1].status = "Declined";
      contacted[1].respondedAt = new Date(created.getTime() + decline * MIN);
    }
    const closed = status === "Fulfilled" || status === "Expired";
    const ttl = { Normal: 72, Urgent: 48, Critical: 24 }[urgency] * HOUR;
    return {
      _id: oid(), seeker: seekerUser._id, familyMemberId: null, patientName: seekerUser.name,
      bloodGroup: GROUPS[(ageMs / HOUR) % GROUPS.length | 0], units: 2, urgency, hospital: "Demo City Hospital",
      area: AREAS[0].area, location: loc, status, hospitalVerified: verified, contactedDonors: contacted,
      reportedBy: [], reportedFake: false, expiresAt: new Date(created.getTime() + ttl), extensions: 0,
      escalationRound: 0, nextEscalationAt: null, closedReason, closedAt: closed ? new Date(created.getTime() + 3 * HOUR) : undefined,
      isDemo: true, createdAt: created, updatedAt: created, __v: 0,
    };
  };
  const requests = [
    mk({ urgency: "Urgent", ageMs: 5 * DAY, status: "Fulfilled", accept: 8 }),
    mk({ urgency: "Normal", ageMs: 9 * DAY, status: "Fulfilled", accept: 22 }),
    mk({ urgency: "Critical", ageMs: 3 * DAY, status: "Fulfilled", accept: 14, verified: true }),
    mk({ urgency: "Urgent", ageMs: 6 * DAY, status: "Fulfilled", accept: 41 }), // slower than 30 minutes
    mk({ urgency: "Normal", ageMs: 12 * DAY, status: "Expired", closedReason: "Timed out", decline: 35 }),
    mk({ urgency: "Urgent", ageMs: 8 * DAY, status: "Expired", closedReason: "Closed by requester" }),
    mk({ urgency: "Urgent", ageMs: 25 * MIN, status: "Contacted" }),
    mk({ urgency: "Normal", ageMs: 2 * HOUR, status: "Contacted", decline: 12 }),
  ];

  return { users, donors, camps, requests };
}

async function main() {
  const remove = process.argv.includes("--remove");
  await mongoose.connect(process.env.MONGODB_URI);

  if (remove) {
    const r = await Request.deleteMany({ isDemo: true });
    const c = await Camp.deleteMany({ isDemo: true });
    const d = await Donor.deleteMany({ isDemo: true });
    const u = await User.deleteMany({ isDemo: true });
    console.log(`Removed demo data: ${u.deletedCount} users, ${d.deletedCount} donors, ${r.deletedCount} requests, ${c.deletedCount} camps.`);
  } else if ((await Donor.exists({ isDemo: true })) || (await User.exists({ isDemo: true }))) {
    console.log("Demo data is already present. Run `node seed-demo.js --remove` first if you want to re-create it.");
  } else {
    const data = buildDemoData();
    // Raw inserts: full control of timestamps, and the deliberately fake
    // placeholder phone numbers skip the real-number format check.
    await User.collection.insertMany(data.users);
    await Donor.collection.insertMany(data.donors);
    await Camp.collection.insertMany(data.camps);
    await Request.collection.insertMany(data.requests);
    console.log(`Added demo data: ${data.users.length} users, ${data.donors.length} donors, ${data.requests.length} requests, ${data.camps.length} camps.`);
    console.log("Remove it any time with:  node seed-demo.js --remove");
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Seeder failed:", err.message);
    process.exit(1);
  });
}

module.exports = { buildDemoData };
