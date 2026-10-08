import { useState } from "react";
import { UserPlus, Trash2, Pencil, HeartPulse } from "lucide-react";
import { api } from "../api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PHONE_REGEX = /^[6-9]\d{9}$/;

const BLANK = {
  name: "",
  relation: "",
  bloodGroup: "",
  phone: "",
  hasRecurringCare: false,
  conditionName: "",
  intervalDays: 21,
  lastTransfusionDate: "",
};

export default function FamilyMembersSection({ familyMembers, onChange }) {
  const [editing, setEditing] = useState(null); // null = closed, "new" = adding, or a member _id
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function startAdd() {
    setForm(BLANK);
    setError("");
    setEditing("new");
  }

  function startEdit(m) {
    setForm({
      name: m.name,
      relation: m.relation || "",
      bloodGroup: m.bloodGroup || "",
      phone: m.phone || "",
      hasRecurringCare: !!m.recurringCare?.conditionName,
      conditionName: m.recurringCare?.conditionName || "",
      intervalDays: m.recurringCare?.intervalDays || 21,
      lastTransfusionDate: m.recurringCare?.lastTransfusionDate
        ? new Date(m.recurringCare.lastTransfusionDate).toISOString().slice(0, 10)
        : "",
    });
    setError("");
    setEditing(m._id);
  }

  function validate() {
    if (!form.name.trim()) return "Name is required";
    if (form.phone && !PHONE_REGEX.test(form.phone)) return "Phone must be a 10-digit Indian mobile number";
    return null;
  }

  async function save(e) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);

    setBusy(true);
    setError("");
    try {
      const body = {
        name: form.name,
        relation: form.relation,
        bloodGroup: form.bloodGroup || undefined,
        phone: form.phone || undefined,
        recurringCare: form.hasRecurringCare
          ? {
              conditionName: form.conditionName,
              intervalDays: Number(form.intervalDays),
              lastTransfusionDate: form.lastTransfusionDate || undefined,
            }
          : { conditionName: undefined, intervalDays: undefined, lastTransfusionDate: undefined },
      };
      const data =
        editing === "new"
          ? await api.post("/api/auth/me/family", body)
          : await api.patch(`/api/auth/me/family/${editing}`, body);
      onChange(data.user.familyMembers);
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberId) {
    if (!confirm("Remove this family member? Any donor profile under their name will be removed too.")) return;
    setBusy(true);
    setError("");
    try {
      const data = await api.del(`/api/auth/me/family/${memberId}`);
      onChange(data.user.familyMembers);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, border: "none", padding: 0 }}>Family members</h3>
        {editing === null && (
          <button className="secondary" onClick={startAdd}>
            <UserPlus size={14} /> Add
          </button>
        )}
      </div>
      <p style={{ color: "var(--text-soft)", fontSize: "0.85rem", marginTop: -6, marginBottom: 14 }}>
        Add people in your household so you can raise a request, or register them as a donor,
        without them needing their own login.
      </p>

      {error && <p className="error">{error}</p>}

      {(familyMembers || []).map((m) =>
        editing === m._id ? (
          <FamilyForm key={m._id} form={form} setForm={setForm} onCancel={() => setEditing(null)} onSave={save} busy={busy} />
        ) : (
          <div key={m._id} className="list-row">
            <div>
              <div className="row-title">{m.name}</div>
              <div className="row-sub">
                {[m.relation, m.bloodGroup, m.phone].filter(Boolean).join(" · ") || "No details yet"}
              </div>
              {m.recurringCare?.conditionName && (
                <RecurringCareBadge care={m.recurringCare} />
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="ghost" onClick={() => startEdit(m)}>
                <Pencil size={14} />
              </button>
              <button className="ghost" onClick={() => remove(m._id)} disabled={busy}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )
      )}

      {editing === "new" && <FamilyForm form={form} setForm={setForm} onCancel={() => setEditing(null)} onSave={save} busy={busy} />}

      {(!familyMembers || familyMembers.length === 0) && editing === null && (
        <p className="empty-note">No family members added yet.</p>
      )}
    </div>
  );
}

function RecurringCareBadge({ care }) {
  if (!care.lastTransfusionDate || !care.intervalDays) {
    return (
      <div className="row-sub" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
        <HeartPulse size={12} /> {care.conditionName} — recurring care tracked
      </div>
    );
  }
  const nextDue = new Date(care.lastTransfusionDate);
  nextDue.setDate(nextDue.getDate() + care.intervalDays);
  const isDue = nextDue <= new Date();

  return (
    <div
      className="row-sub"
      style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, color: isDue ? "var(--primary)" : undefined, fontWeight: isDue ? 600 : undefined }}
    >
      <HeartPulse size={12} />
      {care.conditionName} — {isDue ? "due now" : `next due ${nextDue.toLocaleDateString()}`}
    </div>
  );
}

function FamilyForm({ form, setForm, onCancel, onSave, busy }) {
  return (
    <form onSubmit={onSave} style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 10 }}>
      <label>Name</label>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

      <label>Relation (optional)</label>
      <input
        placeholder="e.g. Father, Sister"
        value={form.relation}
        onChange={(e) => setForm({ ...form, relation: e.target.value })}
      />

      <label>Blood group (optional)</label>
      <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
        <option value="">Unknown</option>
        {BLOOD_GROUPS.map((bg) => (
          <option key={bg} value={bg}>
            {bg}
          </option>
        ))}
      </select>

      <label>Phone (optional — only needed if they'll respond to donor alerts themselves)</label>
      <input
        placeholder="10-digit mobile number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />

      <label className="checkbox-label" style={{ marginTop: 16 }}>
        <input
          type="checkbox"
          checked={form.hasRecurringCare}
          onChange={(e) => setForm({ ...form, hasRecurringCare: e.target.checked })}
        />
        Needs regular transfusions (e.g. Thalassemia) — track and remind
      </label>

      {form.hasRecurringCare && (
        <div style={{ borderLeft: "2px solid var(--primary)", paddingLeft: 12, marginTop: 10 }}>
          <label>Condition name</label>
          <input
            placeholder="e.g. Thalassemia Major"
            value={form.conditionName}
            onChange={(e) => setForm({ ...form, conditionName: e.target.value })}
          />

          <label>Days between transfusions</label>
          <input
            type="number"
            min={7}
            max={120}
            value={form.intervalDays}
            onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
          />

          <label>Date of last transfusion</label>
          <input
            type="date"
            value={form.lastTransfusionDate}
            onChange={(e) => setForm({ ...form, lastTransfusionDate: e.target.value })}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="submit" disabled={busy}>
          Save
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
