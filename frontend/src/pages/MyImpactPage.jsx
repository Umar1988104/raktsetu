import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, CalendarCheck, Droplets, Flame, Share2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Switch from "../components/Switch";
import ShareImageSheet from "../components/ShareImageSheet";
import { useToast } from "../components/UiFeedback";
import { drawDonatedImage } from "../utils/shareImage";

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });

// "My impact" (v2.1c): your own donation history in one place, a picture you
// can share, and opt-in badges and streaks. Everything here is private to you.
export default function MyImpactPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [donors, setDonors] = useState(null);
  const [ach, setAch] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [name, setName] = useState("");
  const [showGroup, setShowGroup] = useState(false);
  const [showDate, setShowDate] = useState(true);

  useEffect(() => {
    api.get("/api/donors/me").then((d) => setDonors(d.donors)).catch(() => setDonors([]));
    api.get("/api/auth/me/achievements").then(setAch).catch(() => setAch({ enabled: false, unavailable: true }));
  }, []);

  const family = profile?.user?.familyMembers || [];
  const own = donors?.find((d) => !d.familyMemberId) || null;

  const entries = useMemo(() => {
    const out = [];
    for (const d of donors || []) {
      const who = d.familyMemberId ? family.find((m) => String(m._id) === String(d.familyMemberId))?.name || "Family member" : "You";
      for (const h of d.donationHistory || []) out.push({ id: h._id || `${d._id}-${h.date}`, date: h.date, who, group: d.bloodGroup });
    }
    return out.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [donors, family]);

  const byYear = useMemo(() => {
    const m = new Map();
    for (const e of entries) m.set(new Date(e.date).getFullYear(), (m.get(new Date(e.date).getFullYear()) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [entries]);

  const ownDates = (own?.donationHistory || []).map((h) => new Date(h.date)).sort((a, b) => b - a);
  const lastOwn = ownDates[0] || null;
  const nextEligible = own?.nextEligibleDate && new Date(own.nextEligibleDate) > new Date() ? own.nextEligibleDate : null;

  const draw = useCallback(
    () => drawDonatedImage({ name: name.trim() || undefined, bloodGroup: showGroup ? own?.bloodGroup : undefined, date: showDate ? lastOwn : undefined }),
    [name, showGroup, showDate, own, lastOwn]
  );

  async function setAchievements(enabled) {
    try {
      await api.patch("/api/auth/me/achievements", { enabled });
      setAch(enabled ? await api.get("/api/auth/me/achievements") : { enabled: false });
      toast(enabled ? "Badges and streaks are on." : "Badges and streaks are off.", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (donors === null) return <div className="card"><Skeleton rows={4} /></div>;

  const maxYear = Math.max(1, ...byYear.map(([, n]) => n));

  return (
    <div>
      <div className="page-header">
        <h1>My impact</h1>
        <p>Your donations in one place. Only you can see this page.</p>
      </div>

      {entries.length === 0 ? (
        <div className="card">
          <EmptyState art="camps" title="Your first donation will show up here.">
            <p className="status">When a request you helped with is marked fulfilled, the donation is recorded on your profile.</p>
            <Link to="/dashboard" className="btn-outline">Back to dashboard</Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="impact-tiles">
            <div className="impact-tile"><Droplets size={18} aria-hidden="true" /><span className="impact-num">{entries.length}</span><span>donation{entries.length > 1 ? "s" : ""} recorded</span></div>
            <div className="impact-tile"><CalendarCheck size={18} aria-hidden="true" /><span className="impact-num">{fmt(entries[0].date)}</span><span>most recent</span></div>
            {nextEligible && <div className="impact-tile"><CalendarCheck size={18} aria-hidden="true" /><span className="impact-num">{fmt(nextEligible)}</span><span>you can donate again</span></div>}
          </div>

          <div className="card">
            <h3>People you may have helped</h3>
            <p className="impact-big">Up to {entries.length * 3}</p>
            <p className="status">A commonly cited estimate: donated blood is separated into parts, so one donation may help up to three patients. How it is actually used is up to the blood bank.</p>
          </div>

          <div className="card">
            <h3>Donations by year</h3>
            <ul className="year-bars" aria-label="Donations by year">
              {byYear.map(([y, n]) => (
                <li key={y}>
                  <span className="year-label">{y}</span>
                  <span className="year-bar"><i style={{ width: `${(n / maxYear) * 100}%` }} /></span>
                  <span className="year-n">{n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>History</h3>
            <ul className="impact-history">
              {entries.map((e) => (
                <li key={e.id}><span>{fmt(e.date)}</span><span>{e.who}{e.group ? ` · ${e.group}` : ""}</span></li>
              ))}
            </ul>
          </div>

          {lastOwn && (
            <div className="card">
              <h3>Share that you donated</h3>
              <p className="status">Make a picture for WhatsApp or Instagram. You choose what is on it — it is made on your device and not uploaded anywhere.</p>
              <button type="button" onClick={() => setShareOpen(true)}><Share2 size={16} aria-hidden="true" /> Make my picture</button>
            </div>
          )}
        </>
      )}

      <AchievementsCard ach={ach} onToggle={setAchievements} />

      <ShareImageSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Your “I donated” picture"
        hint="Nothing is added unless you choose it below."
        draw={draw}
        filename="i-donated-blood.png"
        message="I donated blood. Every drop counts — join me on RaktSetu."
        alt="Preview of your I donated blood picture"
      >
        <div className="share-options">
          <label htmlFor="share-name">Your name (optional)</label>
          <input id="share-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Leave empty to stay anonymous" />
          <label className="check-row"><input type="checkbox" checked={showGroup} onChange={(e) => setShowGroup(e.target.checked)} disabled={!own?.bloodGroup} /> Show my blood group{own?.bloodGroup ? ` (${own.bloodGroup})` : ""}</label>
          <label className="check-row"><input type="checkbox" checked={showDate} onChange={(e) => setShowDate(e.target.checked)} /> Show the date of my last donation</label>
        </div>
      </ShareImageSheet>
    </div>
  );
}

function AchievementsCard({ ach, onToggle }) {
  if (!ach || ach.unavailable) return null;
  return (
    <div className="card" aria-label="Badges and streaks">
      <div className="switch-row">
        <div>
          <h3 style={{ margin: 0 }}><Award size={16} aria-hidden="true" /> Badges and streaks</h3>
          <p className="status" style={{ margin: "4px 0 0" }}>Just for fun, and off by default. Private to you unless you also switch on “My badges” in your card&apos;s privacy settings.</p>
        </div>
        <Switch checked={!!ach.enabled} onChange={onToggle} label="Show my badges and streaks" />
      </div>
      {ach.enabled && (
        <div className="badge-area">
          {ach.badges.length === 0 ? (
            <p className="status">No badges yet — your first recorded donation earns one.</p>
          ) : (
            <ul className="badge-list" aria-label="Badges you have earned">
              {ach.badges.map((b) => <li key={b.id} className="badge-chip"><Award size={14} aria-hidden="true" /> {b.label}</li>)}
            </ul>
          )}
          {ach.next && <p className="status">Next badge: <strong>{ach.next.label}</strong> — {ach.next.needed} more recorded donation{ach.next.needed > 1 ? "s" : ""}.</p>}
          <p className="streak-line"><Flame size={16} aria-hidden="true" /><span>Current streak: <strong>{ach.streak.current}</strong> · Best: <strong>{ach.streak.best}</strong></span></p>
          <p className="status">A streak counts donations made within about six months of each other. It is only for fun: donate when you are eligible — never to keep a streak.</p>
        </div>
      )}
    </div>
  );
}
