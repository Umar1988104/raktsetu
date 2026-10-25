import { Link } from "react-router-dom";
import { BrandLockup } from "../components/Brand";

export default function PrivacyPolicyPage() {
  return (
    <div>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-brand" style={{ padding: 0 }}>
          <BrandLockup />
        </Link>
      </nav>

      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: 22 October 2026 (v2.0). A plain-language explanation of what we actually store and why.</p>
        </div>

        <div className="card">
          <h3>What we collect</h3>
          <p>
            When you sign up, we store your name, email, and phone number. If you fill them in,
            we also store an alternate phone number, address, and a small profile photo. If you're
            a donor, we store your blood group, a general area, and a precise location (for
            distance-based matching). If you add family members, we store their name, relation,
            blood group, and phone — only to help you manage requests and donor profiles on their
            behalf.
          </p>
        </div>

        <div className="card">
          <h3>What we never ask for</h3>
          <p>
            We never ask for or store government ID numbers, payment details, or your exact home
            address beyond what you choose to type into the optional address field. We don't use
            your data for advertising, and we don't sell it to anyone.
          </p>
        </div>

        <div className="card">
          <h3>Who can see your name and phone number</h3>
          <p>
            Someone just browsing the donor list sees only a first name and initial (like “Rohan
            S.”) and a masked phone number. Nothing is shared in either direction until a donor
            accepts a request: only then does the donor see the requester's name and phone, and the
            requester see the donor's name and phone (so they can call each other). A verified
            hospital partner doing a genuine donor check can see a donor's full name and phone.
            Your email, exact location and notification tokens are never shown to other users.
          </p>
        </div>

        <div className="card">
          <h3>Requests, matching and notifications</h3>
          <p>
            When a request is raised we find compatible, available donors nearby and notify them —
            by push notification if they have enabled it, otherwise by email. The email says the
            blood group, number of units, urgency, hospital and area; it does not contain anyone's
            phone number. If nobody accepts, the request is shown to the next batch of donors a few
            times. Requests close on their own after a while (Normal 72 hours, Urgent 48, Critical
            24), and the requester is asked “Still need blood?” before that happens. A Critical
            request is only released to donors after an approved hospital partner confirms it.
          </p>
          <p>
            The seeker's map shows approximate donor positions only (rounded to roughly 1 km).
            Donors can switch on “Show me on the map” or off in their profile. Staying off the map
            does not stop you being matched and notified; you simply appear to the requester only
            after you accept.
          </p>
        </div>

        <div className="card">
          <h3>Planned and repeating requests</h3>
          <p>
            A request can be planned up to 30 days ahead; donors are only contacted about three days
            before it is needed. A repeating request (for example for regular transfusions) stores the
            hospital, area, location, blood group, units and schedule you entered, and the server turns
            each occurrence into a normal request about a week before it is due, sending you a reminder
            email. You can pause, skip or stop it any time, and deleting it removes the stored plan.
            Repeating requests need a verified email so they cannot be used for spam.
          </p>
        </div>

        <div className="card">
          <h3>Donor contact preferences and reminders</h3>
          <p>
            Donors can choose quiet hours or “emergencies only”. They stay in the donor pool; we simply
            don't contact them at those times, and Critical requests still reach everyone. If you have
            donated before and enough time has passed, we send one email telling you that you can donate
            again, once per donation. Platelet and plasma requests use the same donation gap as blood to
            be safe; the blood bank always makes the final eligibility decision.
          </p>
        </div>

        <div className="card">
          <h3>The public request map and your device</h3>
          <p>
            The Impact page shows a map of where blood was requested in the last 90 days. It is
            built only from counts: requests are grouped into areas about 11 km wide, an area is shown
            only when it has at least 5 requests, and nothing else (no names, hospitals, exact places or
            request details) is included.
          </p>
          <p>
            A few small things are remembered only in your own browser: notifications you dismissed, a
            hidden setup checklist, requests whose thank-you you've seen, and your display choices. They
            are never sent to us, and clearing your browser data removes them.
          </p>
        </div>

        <div className="card">
          <h3>Blood group and sex are self-declared</h3>
          <p>
            Donors and requesters type in their own blood group, and donors may state their sex (used
            only to apply the right gap between donations). RaktSetu cannot test blood. A “Verified”
            badge means a hospital partner checked that donor, not that RaktSetu tested their blood.
            Always confirm the blood group at the blood bank.
          </p>
        </div>

        <div className="card">
          <h3>Email verification and hospital partners</h3>
          <p>
            To become a donor, accept a request or use hospital tools you must verify your email
            (Firebase sends the verification link). Raising a blood request never requires it.
            Anyone can sign up as a hospital, so hospital tools (verifying requests and donors,
            card lookup, posting camps) only unlock after an administrator has checked the hospital
            outside the app.
          </p>
        </div>

        <div className="card">
          <h3>Guest sessions</h3>
          <p>
            You can raise an emergency request as a guest with just a name and phone number. A guest
            can later save the account with an email and password, keeping the same requests.
            Guests have no card, and a guest who logs out without saving cannot get back in.
          </p>
        </div>

        <div className="card">
          <h3>Shared tracking links</h3>
          <p>
            A request's share link shows only blood group, units, urgency, hospital, area, status
            and donor counts — no names, phone numbers or patient name.
          </p>
        </div>

        <div className="card">
          <h3>Abuse protection and admin actions</h3>
          <p>
            To stop spam and guessing, the server counts requests per internet address for a short
            time (kept in memory, not stored in the database). If a request is reported as fake by
            two donors it is closed and the requester is blocked from new requests for 48 hours;
            an administrator can reverse this. Administrator actions (closing a request, approving a
            hospital, lifting a block, downloading anonymous statistics) are recorded with the kind
            of action and a short description — no personal details — and deleted after one year.
            Statistics exports contain only counts, and any group smaller than 5 is hidden.
          </p>
        </div>

        <div className="card">
          <h3>Sample data</h3>
          <p>
            Some deployments include clearly labelled “Demo” donors and requests so the app can be
            shown to people. They are not real people.
          </p>
        </div>

        <div className="card">
          <h3>How your data is stored</h3>
          <p>
            Your account is authenticated through Firebase — we never see or store your password.
            Your profile data lives in MongoDB Atlas, a managed database. We don't run our own
            servers with direct access to raw backups; access is limited to what's needed to run
            the matching engine and send notifications.
          </p>
        </div>

        <div className="card">
          <h3>Your RaktSetu card and QR code</h3>
          <p>
            Each account (and each family member) gets a card with a random ID. Anyone who has the
            ID, or scans the QR code, can open a public page showing only what you allow. By
            default that is your first name and initial, blood group, trust badge and Verified
            mark — for a family member the name is off by default. You can switch any of these off,
            add the year you joined, or an optional yes/no for “eligible to donate today”.
          </p>
          <p>
            Your phone number, email, address, photo and emergency contact are never shown on the
            public page. The emergency contact appears only on the back of your own card and the
            image you download. You can hide the card completely, or create a new ID, at any time —
            the old ID stops working immediately. The page is not listed in search engines, and
            repeated wrong guesses are blocked. Hospital partners can look a donor up by card ID to
            verify them. Guests do not get a card.
          </p>
        </div>

        <div className="card">
          <h3>Invite links</h3>
          <p>
            A donor can share an invite link that contains a random code (not your name, phone or
            email). If someone signs up as a donor through it, we store a hidden link between the
            two accounts. When the invited person&apos;s first donation is recorded, the inviter&apos;s
            trust score goes up by 10 points (at most 20 in total). You can see only two numbers —
            how many people signed up and how many donated — never who they are. Nobody is told
            who invited them. You can show the donated count on your public card, but it is off
            unless you switch it on.
          </p>
        </div>

        <div className="card">
          <h3>Camp RSVPs</h3>
          <p>
            When you tap &ldquo;I&apos;ll come&rdquo; on a donation camp, we store which camp and which account,
            and we email you one reminder the day before. The hospital hosting the camp sees only
            how many people said they&apos;ll come — never who. You can cancel any time, and your
            RSVP is deleted if the camp is cancelled.
          </p>
        </div>

        <div className="card">
          <h3>The blood stock board</h3>
          <p>
            Approved hospital partners can type in how many units of each blood group they hold. The
            numbers are entered by hand, so they can be out of date; every board shows when it was
            last updated and asks you to call the blood bank before travelling. The board shows the
            hospital&apos;s name, address and location, and no personal data about donors or patients.
          </p>
        </div>

        <div className="card">
          <h3>The help chat</h3>
          <p>
            The help chat is not artificial intelligence. It picks a pre-written answer from a fixed
            list. What you type stays in your browser: it is not sent to our server, stored, or
            shared. It can give general information only — always check medical questions with a
            blood bank or doctor.
          </p>
        </div>

        <div className="card">
          <h3>Display settings stored on your device</h3>
          <p>
            Your language, theme (light / dark), contrast and text-size choices are saved in your
            own browser so they're remembered next time. They are never sent to our servers.
          </p>
        </div>

        <div className="card">
          <h3>If something goes wrong</h3>
          <p>
            No system is unbreakable. If we ever became aware of unauthorized access to stored
            data, our priority would be to inform affected users plainly and quickly, not to
            minimize or delay disclosure.
          </p>
        </div>

        <div className="card">
          <h3>Your choices</h3>
          <p>
            You can edit or remove most of your information yourself from your Profile page at any
            time, including removing family members. If you want your account fully deleted,
            contact the team running this deployment directly.
          </p>
        </div>
      </div>
    </div>
  );
}
