import { Link } from "react-router-dom";
import { Droplet } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div>
      <nav className="landing-nav">
        <Link to="/" className="sidebar-brand" style={{ padding: 0 }}>
          <span className="mark">
            <Droplet size={16} fill="currentColor" />
          </span>
          RaktSetu
        </Link>
      </nav>

      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1>Privacy Policy</h1>
          <p>Last updated: a plain-language explanation of what we actually store and why.</p>
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
          <h3>Who can see your phone number</h3>
          <p>
            Your full phone number is never shown to someone just browsing the donor list. It's
            only visible to a seeker once your profile is actually matched to one of their real
            requests, or to a verified hospital partner account doing a legitimate donor
            verification. Everyone else sees a masked number.
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
