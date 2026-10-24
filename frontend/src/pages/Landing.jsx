import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Droplet,
  MapPin,
  BellRing,
  ActivitySquare,
  ShieldCheck,
  PhoneOff,
  Hourglass,
  Building2,
} from "lucide-react";
import { api } from "../api";
import { useLang } from "../i18n";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import AppearanceButton from "../components/AppearanceSheet";
import { BrandLink, BridgeDivider, HeroBridge } from "../components/Brand";
import SegmentedControl from "../components/SegmentedControl";
import FaqList from "../components/FaqList";

// "Who is this for?" — three short stories (v2.0).
const PERSONAS = {
  families: {
    label: { en: "Families", hi: "परिवार" },
    title: { en: "When someone you love needs blood", hi: "जब किसी अपने को रक्त चाहिए" },
    points: {
      en: ["Raise a request in under a minute — or use SOS, even without an account.", "Nearby, compatible donors are notified straight away, and you watch every step.", "For regular transfusions, repeat the request and we create each one for you."],
      hi: ["एक मिनट से कम में अनुरोध करें — या SOS इस्तेमाल करें, बिना खाते के भी।", "पास के उपयुक्त दाताओं को तुरंत सूचना जाती है, और आप हर कदम देख सकते हैं।", "नियमित ट्रांसफ़्यूज़न के लिए अनुरोध दोहराएँ — हर बार हम बना देंगे।"],
    },
    cta: { label: { en: "Request blood", hi: "रक्त का अनुरोध" }, to: "/emergency" },
  },
  donors: {
    label: { en: "Donors", hi: "दाता" },
    title: { en: "Give when it matters, on your terms", hi: "ज़रूरत के वक़्त दें, अपनी शर्तों पर" },
    points: {
      en: ["You are matched only to compatible requests near you.", "Your phone number stays hidden until you accept.", "Set quiet hours, go emergencies-only, or stay off the map — and keep a card with your donation stamps."],
      hi: ["आपको सिर्फ़ पास के उपयुक्त अनुरोधों से जोड़ा जाता है।", "आप स्वीकार करें, तब तक आपका फ़ोन नंबर छिपा रहता है।", "शांत समय रखें, केवल आपात चुनें, या मानचित्र से हटे रहें — और दान की मुहरों वाला कार्ड पाएँ।"],
    },
    cta: { label: { en: "Become a donor", hi: "दाता बनें" }, to: "/signup" },
  },
  hospitals: {
    label: { en: "Hospitals", hi: "अस्पताल" },
    title: { en: "Verified partners, real trust", hi: "सत्यापित साझेदार, असली भरोसा" },
    points: {
      en: ["Approved partners confirm Critical requests before donors are contacted.", "Verify donors in bulk and look them up by card ID, not by phone number.", "Post and manage donation camps; every approval is checked by an admin first."],
      hi: ["मंज़ूर साझेदार गंभीर अनुरोधों की पुष्टि करते हैं, उसके बाद ही दाताओं से संपर्क होता है।", "दाताओं को एक साथ सत्यापित करें और फ़ोन नंबर की जगह कार्ड आईडी से खोजें।", "रक्तदान शिविर डालें और संभालें; हर मंज़ूरी पहले एडमिन जाँचता है।"],
    },
    cta: { label: { en: "Join as a hospital", hi: "अस्पताल के रूप में जुड़ें" }, to: "/signup" },
  },
};

export default function Landing() {
  const { t, lang } = useLang();
  const { firebaseUser, profile } = useAuth();
  const signedIn = !!(firebaseUser && profile);
  const [stats, setStats] = useState(null);
  const [persona, setPersona] = useState("families");

  useEffect(() => {
    api.get("/api/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <nav className="landing-nav">
        <BrandLink style={{ padding: 0 }} />
        <div className="nav-links">
          <Link to="/emergency" className="nav-emergency hide-mobile">
            {t("Emergency — Request Now")}
          </Link>
          <div className="hide-mobile">
            <LanguageToggle />
          </div>
          <AppearanceButton />
          {signedIn ? (
            <Link to="/dashboard" className="btn-primary">
              {t("Open dashboard")}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-outline">
                {t("Log in")}
              </Link>
              <Link to="/signup" className="btn-primary">
                {t("Get started")}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <div className="landing-hero">
        <div>
          <h1>
            {lang === "hi" ? (
              <>
                क्योंकि हर <span className="accent">बूँद</span> मायने रखती है।
              </>
            ) : (
              <>
                Because every <span className="accent">drop</span> counts.
              </>
            )}
          </h1>
          <p>
            {t(
              "Connect nearby compatible donors with people who need blood right now — one trackable request instead of forty frantic phone calls."
            )}
          </p>
          <div className="cta-row">
            {signedIn ? (
              <Link to="/dashboard" className="btn-primary">
                {t("Open dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary">
                  {t("Get started")}
                </Link>
                <Link to="/login" className="btn-outline">
                  {t("Log in")}
                </Link>
              </>
            )}
          </div>
          <Link to="/emergency" className="hero-link">
            {t("Need blood right now? Request without an account →")}
          </Link>

          <div className="landing-stats">
            <div>
              <div className="num">{stats ? stats.totalDonors : "—"}</div>
              <div className="lbl">{t("Registered donors")}</div>
            </div>
            <div>
              <div className="num">{stats ? stats.availableDonors : "—"}</div>
              <div className="lbl">{t("Available right now")}</div>
            </div>
            <div>
              <div className="num">{stats ? stats.fulfilledRequests : "—"}</div>
              <div className="lbl">{t("Requests fulfilled")}</div>
            </div>
          </div>
        </div>

        <HeroArt />
      </div>

      <BridgeDivider />

      {/* ---------- The problem ---------- */}
      <section className="landing-section">
        <div className="section-inner">
          <p className="section-kicker">{t("The problem")}</p>
          <h2>{t("Finding a donor in time shouldn't depend on luck.")}</h2>
          <div className="problem-grid">
            <div className="problem-card">
              <Hourglass size={20} className="problem-icon" />
              <div className="problem-num">14.6M</div>
              <p>units of blood India needs every year, per a government reply in the Rajya Sabha (2025).</p>
            </div>
            <div className="problem-card">
              <MapPin size={20} className="problem-icon" />
              <div className="problem-num">46%</div>
              <p>of India lives in a "blood desert" where local demand can't be met (BMJ, 2024).</p>
            </div>
            <div className="problem-card">
              <PhoneOff size={20} className="problem-icon" />
              <div className="problem-num">0.17</div>
              <p>units per 1,000 people within a 60-minute radius in Bihar — the worst-served state.</p>
            </div>
          </div>
          <p className="section-foot">
            Right now, families facing an emergency still rely on manual outreach — phone calls to
            relatives, WhatsApp broadcast groups, and calling hospitals one by one. Every minute
            spent dialing is a minute not spent helping.
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="landing-section alt">
        <div className="section-inner">
          <p className="section-kicker">{t("How it works")}</p>
          <h2>{t("From request to donor, in one flow.")}</h2>
          <div className="steps-grid">
            <HowStep icon={<Droplet size={20} />} title="Raise a request" text="Blood group, units, urgency, and hospital — takes under a minute." />
            <HowStep icon={<ActivitySquare size={20} />} title="We rank real matches" text="Compatible, available, nearby donors — ranked by actual distance, not a static directory." />
            <HowStep icon={<BellRing size={20} />} title="Donors are notified" text="Matched donors get notified instantly and can accept or decline with one tap." />
            <HowStep icon={<ShieldCheck size={20} />} title="Tracked to fulfilment" text="Status moves automatically as a donor accepts — right through to fulfilled." />
          </div>
        </div>
      </section>

      {/* ---------- Who it's for ---------- */}
      <section className="landing-section">
        <div className="section-inner">
          <p className="section-kicker">{lang === "hi" ? "किसके लिए" : "Who it's for"}</p>
          <h2>{lang === "hi" ? "श्रृंखला की हर कड़ी के लिए।" : "Built for everyone in the chain."}</h2>
          <SegmentedControl
            variant="vials"
            caption={lang === "hi" ? "एक दृश्य चुनें" : "Choose a view"}
            label={lang === "hi" ? "कौन?" : "Who?"}
            value={persona}
            onChange={setPersona}
            options={Object.entries(PERSONAS).map(([value, p]) => ({ value, label: p.label[lang] || p.label.en }))}
          />
          {(() => {
            const p = PERSONAS[persona];
            return (
              <div className="persona-card" key={persona}>
                <h3>{p.title[lang] || p.title.en}</h3>
                <ul>
                  {(p.points[lang] || p.points.en).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <Link to={p.cta.to} className="btn-primary">{p.cta.label[lang] || p.cta.label.en}</Link>
              </div>
            );
          })()}
        </div>
      </section>

      <BridgeDivider />

      {/* ---------- Differentiation ---------- */}
      <section className="landing-section">
        <div className="section-inner">
          <p className="section-kicker">{t("Why RaktSetu")}</p>
          <h2>{t("Not another static directory.")}</h2>
          <div className="compare-row">
            <div className="compare-card">
              <Building2 size={18} />
              <strong>eRaktKosh</strong>
              <p>Official nationwide blood-bank stock directory by state and district — shows what banks hold, doesn't actively match or notify individual donors.</p>
            </div>
            <div className="compare-card highlight">
              <Droplet size={18} />
              <strong>RaktSetu</strong>
              <p>Actively matches and notifies nearby individual donors by compatibility, distance, and urgency — with verification tiers for the highest-risk requests.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Hospital trust showcase ---------- */}
      <section className="landing-section alt">
        <div className="section-inner" style={{ textAlign: "center" }}>
          <p className="section-kicker" style={{ textAlign: "center" }}>
            {t("Trust")}
          </p>
          {stats?.hospitalPartners?.count > 0 ? (
            <>
              <h2 style={{ margin: "0 auto 32px", textAlign: "center" }}>
                Trusted by {stats.hospitalPartners.count} verified hospital
                {stats.hospitalPartners.count === 1 ? "" : "s"} &amp; blood banks
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                {stats.hospitalPartners.names.map((name) => (
                  <span key={name} className="pill pill-verified" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                    <Building2 size={13} style={{ marginRight: 8, verticalAlign: "middle" }} />
                    {name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 auto 12px", textAlign: "center" }}>Be our first verified hospital partner</h2>
              <p style={{ color: "var(--text-soft)" }}>
                Hospitals and blood banks can join as partner accounts to verify Critical requests
                and donors in their area.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="landing-section alt" id="faq">
        <div className="section-inner">
          <p className="section-kicker">{lang === "hi" ? "सवाल-जवाब" : "FAQ"}</p>
          <h2>{lang === "hi" ? "लोग अक्सर क्या पूछते हैं" : "Questions people ask"}</h2>
          <FaqList limit={8} />
        </div>
      </section>

      <footer className="landing-footer">
        <span>
          RaktSetu — Team RaktSetu, SIH26198 · <Link to="/privacy">Privacy Policy</Link> · <Link to="/impact">Impact</Link>
        </span>
        <span className="landing-footer-sources">
          Sources: Rajya Sabha (2025) · BMJ blood-desert study (2024)
        </span>
      </footer>
    </div>
  );
}

function HowStep({ icon, title, text }) {
  const { t } = useLang();
  return (
    <div className="how-step">
      <div className="how-step-icon">{icon}</div>
      <h3 style={{ fontSize: "1rem" }}>{t(title)}</h3>
      <p>{text}</p>
    </div>
  );
}

function HeroArt() {
  return (
    <div className="landing-art">
      <HeroBridge />
    </div>
  );
}
