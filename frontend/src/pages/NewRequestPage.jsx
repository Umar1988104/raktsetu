import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HeartHandshake, Siren, MapPin, CheckCircle2, Minus, Plus } from "lucide-react";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import { useAuth } from "../context/AuthContext";
import VoiceInputButton from "../components/VoiceInputButton";
import EmergencyCallButtons from "../components/EmergencyCallButtons";
import SegmentedControl from "../components/SegmentedControl";
import Switch from "../components/Switch";
import { useLang } from "../i18n";
import { localInputValue, formatNeededBy } from "../requestFormat";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY_HELP = {
  Normal: "Needed within a day or two.",
  Urgent: "Needed within hours.",
  Critical: "Life-threatening. A hospital partner must confirm it before donors are contacted.",
};
const COMPONENT_HELP = {
  "Whole blood": "",
  Platelets: "Platelets are matched to the same blood group and given through a blood bank procedure. The blood bank decides if a donor is suitable.",
  Plasma: "Plasma matching is different from blood (AB plasma suits everyone). The blood bank decides if a donor is suitable.",
};
const STEPS = ["Patient & need", "Where & when", "Review"];
const MIN_HOURS_AHEAD = 24;
const MAX_DAYS_AHEAD = 30;

export default function NewRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const isSos = searchParams.get("sos") === "1";
  const familyMembers = profile?.user?.familyMembers || [];
  const isGuest = !!profile?.user?.isGuest;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    familyMemberId: "",
    bloodGroup: "", // chosen on purpose: a wrong default blood group could be dangerous
    component: "Whole blood",
    units: 1,
    urgency: isSos ? "Urgent" : "Normal",
    hospital: "",
    area: "",
    lat: "",
    lng: "",
    notes: "",
    when: "now", // "now" | "later"
    neededBy: "",
    repeat: false,
    everyWeeks: 3,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [manualLoc, setManualLoc] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // SOS mode: grab the location straight away so there's one less thing to do.
  useEffect(() => {
    if (isSos) {
      getCurrentLocation()
        .then(({ lat, lng }) => setForm((f) => ({ ...f, lat, lng })))
        .catch(() => {});
    }
  }, [isSos]);

  async function useLocation() {
    setLocBusy(true);
    setStatus("");
    try {
      const { lat, lng } = await getCurrentLocation();
      set({ lat, lng });
      setErrors((e) => ({ ...e, location: undefined }));
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLocBusy(false);
    }
  }

  const locationSet = form.lat !== "" && form.lng !== "" && Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng));

  function validate(part) {
    const e = {};
    if (part === "patient" || part === "all") {
      if (!form.bloodGroup) e.bloodGroup = "Choose the blood group.";
      if (!(form.units >= 1)) e.units = "At least 1 unit.";
    }
    if (part === "where" || part === "all") {
      if (!form.hospital.trim()) e.hospital = "Enter the hospital name.";
      if (!form.area.trim()) e.area = "Enter the area.";
      if (!locationSet) e.location = "Set the location — tap “Use my current location”.";
      if (!isSos && form.when === "later") {
        const t0 = new Date(form.neededBy).getTime();
        if (!form.neededBy || Number.isNaN(t0)) e.neededBy = "Choose the date and time.";
        else if (t0 - Date.now() < MIN_HOURS_AHEAD * 3600e3) e.neededBy = `Plan-ahead needs at least ${MIN_HOURS_AHEAD} hours. For sooner, choose “Now”.`;
        else if (t0 - Date.now() > MAX_DAYS_AHEAD * 24 * 3600e3) e.neededBy = `You can plan up to ${MAX_DAYS_AHEAD} days ahead.`;
      }
    }
    return e;
  }

  const stepPart = ["patient", "where", "all"][step];

  function next() {
    const e = validate(stepPart);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  }

  async function submit(ev) {
    ev?.preventDefault();
    // Pressing Enter on an early step means "next", never "send the request".
    if (!isSos && step < STEPS.length - 1) {
      next();
      return;
    }
    const e = validate("all");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      if (!isSos) setStep(e.bloodGroup || e.units ? 0 : 1);
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const planned = !isSos && form.when === "later";
      if (planned && form.repeat) {
        await api.post("/api/recurring", {
          familyMemberId: form.familyMemberId || undefined,
          bloodGroup: form.bloodGroup,
          component: form.component,
          units: form.units,
          hospital: form.hospital,
          area: form.area,
          lat: form.lat,
          lng: form.lng,
          notes: form.notes,
          everyWeeks: form.everyWeeks,
          firstNeededAt: new Date(form.neededBy).toISOString(),
        });
        navigate("/requests", { state: { planCreated: true } });
        return;
      }
      const data = await api.post("/api/requests", {
        familyMemberId: form.familyMemberId || undefined,
        bloodGroup: form.bloodGroup,
        component: form.component,
        units: form.units,
        urgency: form.urgency,
        hospital: form.hospital,
        area: form.area,
        lat: form.lat,
        lng: form.lng,
        notes: form.notes,
        neededBy: planned ? new Date(form.neededBy).toISOString() : undefined,
      });
      navigate(`/requests/${data.request._id}`, data.awaitingHospitalVerification ? { state: { justCreatedCritical: true } } : undefined);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- sections ---------- */
  const patientSection = (
    <>
      {familyMembers.length > 0 && (
        <>
          <label htmlFor="who">{t("Who needs blood?")}</label>
          <select
            id="who"
            value={form.familyMemberId}
            onChange={(e) => {
              const fm = familyMembers.find((m) => m._id === e.target.value);
              set({ familyMemberId: e.target.value, bloodGroup: fm?.bloodGroup || form.bloodGroup });
            }}
          >
            <option value="">{t("Myself")}</option>
            {familyMembers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} {m.relation ? `(${m.relation})` : ""}
              </option>
            ))}
          </select>
        </>
      )}

      <label id="bg-label">{t("Blood group required")}</label>
      <div className="chip-grid" role="radiogroup" aria-labelledby="bg-label">
        {BLOOD_GROUPS.map((bg) => (
          <button
            key={bg}
            type="button"
            role="radio"
            aria-checked={form.bloodGroup === bg}
            className="chip"
            onClick={() => {
              set({ bloodGroup: bg });
              setErrors((e) => ({ ...e, bloodGroup: undefined }));
            }}
          >
            {bg}
          </button>
        ))}
      </div>
      {errors.bloodGroup && <p className="field-error" role="alert">{errors.bloodGroup}</p>}
      <p className="field-hint">Check this against the hospital's report. A wrong group can be dangerous.</p>

      <label>What is needed?</label>
      <SegmentedControl
        block
        label="What is needed"
        value={form.component}
        onChange={(v) => set({ component: v })}
        options={[
          { value: "Whole blood", label: "Blood" },
          { value: "Platelets", label: "Platelets" },
          { value: "Plasma", label: "Plasma" },
        ]}
      />
      {COMPONENT_HELP[form.component] && <p className="field-hint">{COMPONENT_HELP[form.component]}</p>}

      <label id="units-label">{t("Units required")}</label>
      <div className="units-stepper" role="group" aria-labelledby="units-label">
        <button type="button" className="ghost" aria-label="One less unit" disabled={form.units <= 1} onClick={() => set({ units: form.units - 1 })}>
          <Minus size={18} />
        </button>
        <output aria-live="polite">{form.units}</output>
        <button type="button" className="ghost" aria-label="One more unit" disabled={form.units >= 10} onClick={() => set({ units: form.units + 1 })}>
          <Plus size={18} />
        </button>
      </div>
    </>
  );

  const whereSection = (
    <>
      <label htmlFor="hospital">{t("Hospital")}</label>
      <div className="location-row">
        <input id="hospital" value={form.hospital} onChange={(e) => set({ hospital: e.target.value })} style={{ flex: 1 }} autoComplete="off" />
        <VoiceInputButton onResult={(text) => set({ hospital: text })} />
      </div>
      {errors.hospital && <p className="field-error" role="alert">{errors.hospital}</p>}

      <label htmlFor="area">{t("Area")}</label>
      <div className="location-row">
        <input id="area" value={form.area} onChange={(e) => set({ area: e.target.value })} style={{ flex: 1 }} autoComplete="off" />
        <VoiceInputButton onResult={(text) => set({ area: text })} />
      </div>
      {errors.area && <p className="field-error" role="alert">{errors.area}</p>}

      <label>{t("Location")}</label>
      {locationSet ? (
        <div className="location-chip">
          <CheckCircle2 size={18} /> Location set
          <button type="button" className="ghost" style={{ marginLeft: "auto", minHeight: 32, padding: "4px 12px" }} onClick={useLocation} disabled={locBusy}>
            Update
          </button>
        </div>
      ) : (
        <button type="button" className="secondary" style={{ width: "100%" }} onClick={useLocation} disabled={locBusy}>
          <MapPin size={16} /> {locBusy ? "Finding you…" : t("Use current location")}
        </button>
      )}
      {errors.location && <p className="field-error" role="alert">{errors.location}</p>}
      <p className="field-hint">
        Use the location of the hospital or patient so nearby donors are found.{" "}
        <button type="button" className="linklike" onClick={() => setManualLoc((v) => !v)}>
          {manualLoc ? "Hide manual entry" : "Enter coordinates manually"}
        </button>
      </p>
      {manualLoc && (
        <div className="location-row">
          <input placeholder="Latitude" aria-label="Latitude" value={form.lat} onChange={(e) => set({ lat: e.target.value })} />
          <input placeholder="Longitude" aria-label="Longitude" value={form.lng} onChange={(e) => set({ lng: e.target.value })} />
        </div>
      )}

      <label>{t("Urgency level")}</label>
      <SegmentedControl
        block
        large
        label="Urgency level"
        value={form.urgency}
        onChange={(v) => set({ urgency: v, ...(v === "Critical" ? { when: "now", repeat: false } : {}) })}
        options={["Normal", "Urgent", "Critical"].map((u) => ({ value: u, label: t(u) }))}
      />
      <p className="field-hint">{URGENCY_HELP[form.urgency]}</p>
      {form.urgency === "Critical" && (
        <p className="status" style={{ marginTop: 12 }}>
          Make sure the hospital name matches a registered hospital partner exactly, or it won't be picked up.
        </p>
      )}

      {!isSos && (
        <>
          <label>When is it needed?</label>
          <SegmentedControl
            block
            label="When is it needed"
            value={form.when}
            onChange={(v) => set({ when: v, neededBy: v === "later" && !form.neededBy ? localInputValue(72) : form.neededBy, ...(v === "now" ? { repeat: false } : {}) })}
            options={[
              { value: "now", label: "Now" },
              { value: "later", label: "Plan ahead" },
            ]}
          />
          {form.urgency === "Critical" && <p className="field-hint">Critical requests are always for right now.</p>}
          {form.urgency !== "Critical" && form.when === "later" && (
            <>
              <label htmlFor="neededBy">Date and time needed</label>
              <input
                id="neededBy"
                type="datetime-local"
                value={form.neededBy}
                min={localInputValue(MIN_HOURS_AHEAD)}
                max={localInputValue(MAX_DAYS_AHEAD * 24)}
                onChange={(e) => set({ neededBy: e.target.value })}
              />
              {errors.neededBy && <p className="field-error" role="alert">{errors.neededBy}</p>}
              <p className="field-hint">Donors are contacted about 3 days before this time, so they aren't asked weeks early.</p>

              {!isGuest && (
                <div className="switch-row" style={{ marginTop: 16 }}>
                  <label htmlFor="repeat" className="switch-text">
                    <span className="switch-label">Repeat this request</span>
                    <span className="switch-hint">For regular transfusions (for example thalassemia or dialysis).</span>
                  </label>
                  <Switch id="repeat" checked={form.repeat} onChange={(v) => set({ repeat: v })} label="Repeat this request" />
                </div>
              )}
              {form.repeat && (
                <>
                  <label htmlFor="weeks">Repeat every</label>
                  <select id="weeks" value={form.everyWeeks} onChange={(e) => set({ everyWeeks: Number(e.target.value) })}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>{w} {w === 1 ? "week" : "weeks"}</option>
                    ))}
                  </select>
                  <p className="field-hint">We create each request for you about a week before it's due, and email you a reminder. You can pause or stop it any time in My Requests. Needs a verified email.</p>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );

  const reviewSection = (
    <>
      <ul className="review-list">
        <li><span>Patient</span><span>{form.familyMemberId ? familyMembers.find((m) => m._id === form.familyMemberId)?.name : "Myself"}</span></li>
        <li><span>Needed</span><span>{form.bloodGroup} {form.component === "Whole blood" ? "blood" : form.component} · {form.units} unit(s)</span></li>
        <li><span>Hospital</span><span>{form.hospital}</span></li>
        <li><span>Area</span><span>{form.area}</span></li>
        <li><span>Urgency</span><span>{form.urgency}</span></li>
        <li><span>When</span><span>{form.when === "later" ? formatNeededBy(form.neededBy) : "Now"}</span></li>
        {form.repeat && <li><span>Repeats</span><span>Every {form.everyWeeks} week(s)</span></li>}
      </ul>
      <label htmlFor="notes">{t("Notes (optional)")}</label>
      <textarea id="notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ward, bed number, who to ask for, timing…" />
    </>
  );

  return (
    <div>
      <div className="page-header">
        <h1>{isSos && <Siren size={22} style={{ color: "var(--danger-text)", verticalAlign: "middle", marginRight: 8 }} />}{t("New request")}</h1>
        <p>
          {isSos
            ? t("SOS mode — urgency and your location are pre-filled. Just add the essentials and submit.")
            : t("Fill in the details below — we'll find the best matching donors for you.")}
        </p>
      </div>

      {isSos && <EmergencyCallButtons />}

      <div className="two-col">
        <form onSubmit={submit} className="card" noValidate>
          {!isSos && (
            <div className="wizard-steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((label, i) => (
                <div key={label} className={`wizard-step ${i < step ? "done" : i === step ? "current" : ""}`}>
                  <div className="bar" />
                  <span>{i + 1}. {label}</span>
                </div>
              ))}
            </div>
          )}

          {isSos ? (
            <>
              {patientSection}
              {whereSection}
              <label htmlFor="notes">{t("Notes (optional)")}</label>
              <textarea id="notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </>
          ) : step === 0 ? (
            patientSection
          ) : step === 1 ? (
            whereSection
          ) : (
            reviewSection
          )}

          {status && <p className="error" role="alert">{status}</p>}

          {isSos ? (
            <button type="submit" className="danger" disabled={busy}>{busy ? t("Submitting...") : t("Submit request")}</button>
          ) : (
            <div className="wizard-actions">
              {step > 0 && <button type="button" className="ghost" onClick={() => { setErrors({}); setStep(step - 1); }}>Back</button>}
              {step < STEPS.length - 1 ? (
                <button key="next" type="button" onClick={next}>Next</button>
              ) : (
                <button key="send" type="submit" disabled={busy}>
                  {busy ? t("Submitting...") : form.repeat ? "Save repeating request" : form.when === "later" ? "Schedule request" : t("Submit request")}
                </button>
              )}
            </div>
          )}
        </form>

        <div className="cta-panel">
          <div className="cta-icon">
            <HeartHandshake size={40} style={{ margin: "0 auto" }} />
          </div>
          <h3>{form.when === "later" ? "Planning ahead?" : "Need blood urgently?"}</h3>
          <p>
            {form.when === "later"
              ? "We'll hold your request and contact matching donors about 3 days before you need it."
              : "We'll rank compatible, available donors by distance the moment you submit this request."}
          </p>
        </div>
      </div>
    </div>
  );
}
