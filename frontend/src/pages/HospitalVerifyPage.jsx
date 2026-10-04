import { useEffect, useState } from "react";
import { ShieldCheck, Search, Droplet } from "lucide-react";
import { api } from "../api";

export default function HospitalVerifyPage() {
  const [pending, setPending] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [donors, setDonors] = useState([]);
  const [searching, setSearching] = useState(false);

  function loadPending() {
    api
      .get("/api/requests/pending-verification")
      .then((d) => setPending(d.requests))
      .catch((err) => setError(err.message));
  }

  useEffect(loadPending, []);

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
          <p className="loading">Loading...</p>
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
        <form onSubmit={searchDonors} className="filter-row" style={{ marginBottom: 14 }}>
          <input
            placeholder="Search by name, phone, or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            <Search size={14} /> Search
          </button>
        </form>

        {donors.map((d) => (
          <div key={d._id} className="donor-card">
            <div className="donor-card-main">
              <div>
                <div className="row-title">{d.user?.name}</div>
                <div className="row-sub">
                  {d.bloodGroup} · {d.area} · {d.user?.phone}
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
