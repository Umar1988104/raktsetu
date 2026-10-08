import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Lock } from "lucide-react";
import { api } from "../api";

const TIER_CLASS = { New: "pill-expired", Trusted: "pill-confirmed", Pillar: "pill-verified" };

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DonorNetworkPage() {
  const [donors, setDonors] = useState([]);
  const [filters, setFilters] = useState({ bloodGroup: "", area: "", availableOnly: true });
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (filters.bloodGroup) params.set("bloodGroup", filters.bloodGroup);
      if (filters.area) params.set("area", filters.area);
      if (filters.availableOnly) params.set("availableOnly", "true");
      const data = await api.get(`/api/donors?${params.toString()}`);
      setDonors(data.donors);
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }

  const initials = (name) =>
    (name || "?")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1>Donor network</h1>
        <p>See who's nearby — full contact details unlock once a request actually matches, to protect donor privacy.</p>
      </div>

      <form onSubmit={handleSearch} className="card">
        <div className="filter-row">
          <select value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
            <option value="">All groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
          <input
            placeholder="Search by area"
            value={filters.area}
            onChange={(e) => setFilters({ ...filters, area: e.target.value })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(e) => setFilters({ ...filters, availableOnly: e.target.checked })}
            />
            Available now
          </label>
          <button type="submit" disabled={busy}>
            <Search size={15} /> Search
          </button>
        </div>
      </form>

      <div className="card">
        {!searched ? (
          <p className="empty-note">Use the filters above and click Search.</p>
        ) : donors.length === 0 ? (
          <div className="empty-state">
            <Search size={26} className="empty-icon" />
            <p>No donors match these filters yet.</p>
          </div>
        ) : (
          donors.map((d) => (
            <div key={d._id} className="donor-card">
              <div className="donor-card-main">
                <div className="avatar">{initials(d.display?.name)}</div>
                <div>
                  <div className="row-title">{d.display?.name}{d.display?.relation && ` (${d.display.relation})`}</div>
                  <div className="row-sub">
                    {d.bloodGroup} · {d.area}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className={`pill ${d.available ? "pill-available" : "pill-unavailable"}`}>
                      {d.available ? "Available now" : "Not available"}
                    </span>
                    {d.verified && <span className="pill pill-verified">Verified</span>}
                    <span className={`pill ${TIER_CLASS[d.trustTier] || "pill-expired"}`}>{d.trustTier}</span>
                  </div>
                  <div className="row-sub" style={{ marginTop: 4 }}>
                    <Lock size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    {d.display?.phone}
                  </div>
                </div>
              </div>
              <Link to="/requests/new">
                <button className="secondary">Raise a request</button>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
