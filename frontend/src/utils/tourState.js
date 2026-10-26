// Which quick tour (if any) should a signed-in person see? Remembered in this
// browser only (nothing is sent to the server), per account.
//   new account, nothing remembered  -> "welcome"  (what each feature does)
//   older account, nothing remembered -> "whatsnew" (what changed)
//   later releases                    -> "whatsnew" once per release
const KEY = "rs_tour";
const DAY = 86400e3;

// Pure: decide from what is remembered (easy to test).
export function chooseTour({ state, createdAt, now = Date.now(), version, newAccountDays = 3 }) {
  const s = state || {};
  if (s.welcome !== true && !s.whatsNew) {
    const created = createdAt ? new Date(createdAt).getTime() : NaN;
    const isNew = Number.isFinite(created) && now - created <= newAccountDays * DAY;
    return isNew ? "welcome" : "whatsnew";
  }
  return s.whatsNew === version ? null : "whatsnew";
}

function readAll() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// If storage is blocked we can't remember anything — better to show no tour than
// to show it on every page load.
export function canRemember() {
  try {
    localStorage.setItem("__rs_probe", "1");
    localStorage.removeItem("__rs_probe");
    return true;
  } catch {
    return false;
  }
}

export const getTourState = (userId) => readAll()[userId] || null;

export function markSeen(userId, kind, version) {
  try {
    const all = readAll();
    const prev = all[userId] || {};
    all[userId] = kind === "welcome" ? { welcome: true, whatsNew: version } : { ...prev, whatsNew: version };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
