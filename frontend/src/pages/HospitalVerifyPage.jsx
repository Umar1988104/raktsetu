import { useEffect, useState } from "react";
import Skeleton from "../components/Skeleton";
import { ShieldCheck, Search, Droplet, CreditCard } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { Hourglass } from "lucide-react";

export default function HospitalVerifyPage() {
  const { profile } = useAuth();
  const [pending, setPending] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [donors, setDonors] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cardId, setCardId] = useState("");
  const [cardError, setCardError] = useState("");

  function loadPending() {
    api
      .get("/api/requests/pending-verification")
      .then((d) => setPending(d.requests))
      .catch((err) => setError(err.message));
  }

  const approved = !!profile?.user?.partnerVerified;
  useEffect(() => {
    if (approved) loadPending();
  }, [approved]);

  async function verifyRequest(id) {
    setBusyId(id);
    try {
      await api.patch(`/api/requests/${id}/verify-hospital`, {});
      loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function searchDonors(e) {
    e.preventDefault();
    setSearching(true);
    try {
      const data = await api.get(`/api/donors/search?q=${encodeURIComponent(query)}`);
      setDonors(data.donors);
    } finally {
      setSearching(false);
    }
  }

  // More private than searching by phone: the donor shows their card ID.
  async function lookupCard(e) {
    e.preventDefault();
    setCardError("");
    setSearching(true);
    try {
      const data = await api.get(`/api/cards/lookup/${encodeURIComponent(cardId.trim().toUpperCase())}`);
      setDonors(data.donors || []);
    } catch (err) {
      setDonors([]);
      setCardError(err.status === 404 ? "No card found with that ID. Check it and try again." : err.message);
    } finally {
      setSearching(false);
    }
  }

  async function verifyDonor(id) {
    setBusyId(id);
    try {
      const data = await api.patch(`/api/donors/${id}/verify`, {});
      setDonors((ds) => ds.map((d) => (d._id === id ? data.donor : d)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Hospital tools are locked until an admin approves the hospital (the server enforces this too).
  if (!approved) {
    return (
      <div>
        <div className="page-header">
          <h1>Verify requests</h1>
        </div>
        <div className="card empty-state">
          <div className="emoji"><Hourglass size={40} className="empty-icon" /></div>
          <p><strong>Waiting for admin approval</strong></p>
          <p className="empty-note" style={{ marginTop: 16 }}>
            Anyone can sign up as a hospital, so an administrator checks each one before it can verify
            requests or donors. You'll be able to use this page as soon as yours is approved — refresh
            to check.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Verify requests &amp; donors</h1>
        <p>Critical-urgency requests under your hospital name wait here until you verify them.</p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Pending Critical requests</h3>
        {!pending ? (
          <Skeleton rows={3} />
        ) : pending.length === 0 ? (
          <p className="empty-note">Nothing waiting on verification right now.</p>
        ) : (
          pending.map((r) => (
            <div key={r._id} className="list-row">
              <div className="list-row-main">
                <div className="row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <Droplet size={16} />
                </div>
                <div>
                  <div className="row-title">
                    {r.bloodGroup} · {r.units} unit(s) · Critical
                  </div>
                  <div className="row-sub">
                    {r.area} · Requested by {r.seeker?.name} ({r.seeker?.phone})
                  </div>
                </div>
              </div>
              <button disabled={busyId === r._id} onClick={() => verifyRequest(r._id)}>
                <ShieldCheck size={14} /> Verify &amp; notify donors
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Verify a donor</h3>
        <form onSubmit={searchDonors} className="filter-row" style={{ marginBottom: 16 }}>
          <input
            placeholder="Search by name, phone, or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            <Search size={14} /> Search
          </button>
        </form>

        <form onSubmit={lookupCard} className="filter-row" style={{ marginBottom: 16 }}>
          <input
            placeholder="Or look up by card ID, e.g. RS-7K4M-9QX2"
            aria-label="Card ID"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            autoCapitalize="characters"
          />
          <button type="submit" className="secondary" disabled={searching || cardId.trim().length < 6}>
            <CreditCard size={14} /> Look up
          </button>
        </form>
        {cardError && <p className="error">{cardError}</p>}

        {donors.map((d) => (
          <div key={d._id} className="donor-card">
            <div className="donor-card-main">
              <div>
                <div className="row-title">{d.display?.name}{d.display?.relation && ` (${d.display.relation})`}</div>
                <div className="row-sub">
                  {d.bloodGroup} · {d.area} · {d.display?.phone}
                </div>
              </div>
            </div>
            {d.verified ? (
              <span className="pill pill-verified">Verified</span>
            ) : (
              <button disabled={busyId === d._id} onClick={() => verifyDonor(d._id)}>
                <ShieldCheck size={14} /> Verify
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
