import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, MapPin, Navigation } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useConfirm, useToast } from "../components/UiFeedback";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DISCLAIMER =
  "Hand-updated by the hospital's blood bank, so it can be out of date. Stock changes quickly — please call the blood bank to confirm before you travel.";

function ago(hours) {
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const d = Math.floor(hours / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

// Blood stock board (v2.1). Public. Numbers are typed in by approved hospital
// partners; every board shows how old they are and a "call to confirm" notice.
export default function StockPage() {
  const { profile } = useAuth();
  const role = profile?.user?.role;
  const [boards, setBoards] = useState(null);
  const [disclaimer, setDisclaimer] = useState(DISCLAIMER);
  const [group, setGroup] = useState("");
  const [area, setArea] = useState("");
  const [areaQuery, setAreaQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setAreaQuery(area.trim()), 300);
    return () => clearTimeout(t);
  }, [area]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (group) params.set("bloodGroup", group);
    if (areaQuery) params.set("area", areaQuery);
    api
      .get(`/api/stock?${params.toString()}`)
      .then((d) => {
        setBoards(d.boards);
        if (d.disclaimer) setDisclaimer(d.disclaimer);
      })
      .catch(() => setBoards([]));
  }, [group, areaQuery]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>Blood stock</h1>
        <p>What hospital blood banks have told us they hold right now. Updated by hand.</p>
      </div>

      <div className="banner stock-disclaimer" role="note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>{disclaimer}</span>
      </div>

      <div className="card">
        <div className="stock-filters">
          <div role="group" aria-label="Blood group" className="stock-groups">
            <button type="button" className={`chip-q ${group === "" ? "on" : ""}`} aria-pressed={group === ""} onClick={() => setGroup("")}>All groups</button>
            {GROUPS.map((g) => (
              <button key={g} type="button" className={`chip-q ${group === g ? "on" : ""}`} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
          <label htmlFor="stock-area" className="sr-only">Area</label>
          <input id="stock-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Search by area, e.g. Noida" maxLength={60} />
        </div>
        {group && <p className="status">Showing only blood banks that listed at least 1 unit of {group}.</p>}
      </div>

      {role === "hospital" && <StockUpdateCard onSaved={load} />}

      {boards === null ? (
        <div className="card"><Skeleton rows={3} /></div>
      ) : boards.length === 0 ? (
        <div className="card">
          <EmptyState art="camps" title={group || areaQuery ? "No blood bank matches that." : "No blood bank has posted its stock yet."}>
            <p className="status">Approved hospital partners post stock here. For an urgent need, raise an SOS request instead.</p>
          </EmptyState>
        </div>
      ) : (
        boards.map((b) => <StockBoard key={b.id} board={b} highlight={group} />)
      )}
    </div>
  );
}

function StockBoard({ board, highlight }) {
  const maps = board.location ? `https://www.google.com/maps/search/?api=1&query=${board.location.lat},${board.location.lng}` : null;
  return (
    <section className="card stock-board" aria-label={`${board.hospitalName} blood stock`}>
      <div className="stock-head">
        <div>
          <h3>{board.hospitalName}</h3>
          <p className="row-sub"><MapPin size={12} aria-hidden="true" /> {board.address}, {board.area}</p>
        </div>
        <div className="stock-meta">
          <span className={`pill ${board.stale ? "pill-high" : "pill-normal"}`}>
            <Clock size={12} aria-hidden="true" style={{ marginRight: 4 }} /> <span>Updated <time dateTime={board.updatedAt}>{ago(board.hoursAgo)}</time></span>
          </span>
          {board.stale && <span className="stock-stale">May be out of date</span>}
        </div>
      </div>
      <div className="stock-grid">
        {board.levels.map((l) => (
          <div key={l.group} className={`stock-tile ${l.group === highlight ? "hl" : ""}`} data-level={l.level}>
            <span className="stock-group">{l.group}</span>
            <span className="stock-units">{l.units}</span>
            <span className="stock-level"><i aria-hidden="true" />{l.level}</span>
          </div>
        ))}
      </div>
      <div className="stock-foot">
        <span className="status">Please call the blood bank to confirm before you travel.</span>
        {maps && (
          <a className="btn-outline" href={maps} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Directions</a>
        )}
      </div>
    </section>
  );
}

function StockUpdateCard({ onSaved }) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const approved = !!profile?.user?.partnerVerified;
  const [loaded, setLoaded] = useState(false);
  const [board, setBoard] = useState(null);
  const [units, setUnits] = useState(() => Object.fromEntries(GROUPS.map((g) => [g, "0"])));
  const [info, setInfo] = useState({ address: "", area: "", lat: "", lng: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!approved) return;
    api
      .get("/api/stock/mine")
      .then((d) => {
        setBoard(d.board);
        if (d.board) {
          setUnits(Object.fromEntries(d.board.levels.map((l) => [l.group, String(l.units)])));
          setInfo({ address: d.board.address, area: d.board.area, lat: String(d.board.location?.lat ?? ""), lng: String(d.board.location?.lng ?? "") });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [approved]);

  if (!approved) {
    return (
      <div className="card">
        <h3>Post your blood stock</h3>
        <p className="status">Your hospital account is waiting for admin approval. Once approved you can post your stock here.</p>
      </div>
    );
  }
  if (!loaded) return null;

  async function useMyLocation() {
    try {
      const { lat, lng } = await getCurrentLocation();
      setInfo((i) => ({ ...i, lat: String(lat), lng: String(lng) }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { levels: units };
      if (!board || info.lat !== String(board.location?.lat) || info.lng !== String(board.location?.lng)) {
        body.lat = info.lat;
        body.lng = info.lng;
      }
      body.address = info.address;
      body.area = info.area;
      const d = await api.put("/api/stock/mine", body);
      setBoard(d.board);
      toast("Stock board updated.", "success");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({ title: "Remove your stock board?", message: "It disappears from the public Blood stock page.", confirmLabel: "Remove", cancelLabel: "Keep it", tone: "danger" });
    if (!ok) return;
    try {
      await api.del("/api/stock/mine");
      setBoard(null);
      toast("Stock board removed.", "success");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <form className="card" onSubmit={save} aria-label="Update my blood stock">
      <h3>{board ? "Update your blood stock" : "Post your blood stock"}</h3>
      <p className="status">Type the units you hold right now. The public page shows how long ago you last updated.</p>
      <div className="stock-edit-grid">
        {GROUPS.map((g) => (
          <div key={g}>
            <label htmlFor={`su-${g}`}>{g}</label>
            <input id={`su-${g}`} type="number" inputMode="numeric" min="0" max="999" step="1" value={units[g]} onChange={(e) => setUnits({ ...units, [g]: e.target.value })} required />
          </div>
        ))}
      </div>
      <label htmlFor="su-address">Blood bank address</label>
      <input id="su-address" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} required maxLength={200} />
      <label htmlFor="su-area">Area</label>
      <input id="su-area" value={info.area} onChange={(e) => setInfo({ ...info, area: e.target.value })} required maxLength={100} />
      <div className="stock-coords">
        <div>
          <label htmlFor="su-lat">Latitude</label>
          <input id="su-lat" inputMode="decimal" value={info.lat} onChange={(e) => setInfo({ ...info, lat: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="su-lng">Longitude</label>
          <input id="su-lng" inputMode="decimal" value={info.lng} onChange={(e) => setInfo({ ...info, lng: e.target.value })} required />
        </div>
      </div>
      <button type="button" className="ghost" onClick={useMyLocation}><MapPin size={14} aria-hidden="true" /> Use my current location</button>
      {error && <p className="error">{error}</p>}
      <div className="stock-actions">
        <button type="submit" disabled={busy}>{busy ? "Saving…" : board ? "Save update" : "Post stock"}</button>
        {board && <button type="button" className="ghost" onClick={remove}>Remove my board</button>}
      </div>
    </form>
  );
}
