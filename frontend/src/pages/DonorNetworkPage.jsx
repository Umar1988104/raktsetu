import { useState } from "react";
import { Search, Phone } from "lucide-react";
import { api } from "../api";

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
        <p>Find and connect with nearby donors.</p>
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
            <div className="emoji">🔍</div>
            <p>No donors match these filters yet.</p>
          </div>
        ) : (
          donors.map((d) => (
            <div key={d._id} className="donor-card">
              <div className="donor-card-main">
                <div className="avatar">{initials(d.user?.name)}</div>
                <div>
                  <div className="row-title">{d.user?.name}</div>
                  <div className="row-sub">
                    {d.bloodGroup} · {d.area}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                    <span className={`pill ${d.available ? "pill-available" : "pill-unavailable"}`}>
                      {d.available ? "Available now" : "Not available"}
                    </span>
                    {d.verified && <span className="pill pill-verified">Verified</span>}
                  </div>
                </div>
              </div>
              <a href={`tel:${d.user?.phone}`}>
                <button className="secondary">
                  <Phone size={14} /> Contact
                </button>
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
