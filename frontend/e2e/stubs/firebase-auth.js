// Test stand-in for firebase/auth. State lives in localStorage so it survives page reloads:
//   __signedout=1   start logged out          __unverified=1  email not verified
//   __guest=1       anonymous guest session   __verifysent     counts sendEmailVerification calls
let cb = null;
const flag = (k) => typeof localStorage !== "undefined" && localStorage.getItem(k) === "1";
const makeUser = () => ({
  uid: "u1",
  email: flag("__guest") ? null : "umar@example.com",
  emailVerified: !flag("__unverified"),
  isAnonymous: flag("__guest"),
  getIdToken: async () => "t",
  reload: async function () { this.emailVerified = !flag("__unverified"); },
});
let user = null;
export const auth = { currentUser: null };
export function getAuth() { return auth; }
export function onAuthStateChanged(a, f) {
  cb = f;
  setTimeout(() => { user = flag("__signedout") ? null : makeUser(); a.currentUser = user; f(user); }, 0);
  return () => {};
}
export async function signOut(a) { a.currentUser = null; user = null; localStorage.setItem("__signedout", "1"); if (cb) cb(null); }
export const signInWithEmailAndPassword = async (a) => {
  localStorage.removeItem("__signedout"); user = makeUser(); a.currentUser = user; setTimeout(() => { if (cb) cb(user); }, 50); return { user };
};
export const createUserWithEmailAndPassword = async (a) => { user = makeUser(); a.currentUser = user; return { user }; };
export const signInAnonymously = async (a) => { localStorage.setItem("__guest", "1"); user = makeUser(); a.currentUser = user; return { user }; };
export const sendEmailVerification = async () => { localStorage.setItem("__verifysent", String(Number(localStorage.getItem("__verifysent") || 0) + 1)); };
export const EmailAuthProvider = { credential: (email, password) => ({ email, password }) };
export const linkWithCredential = async (u, cred) => {
  if (cred.email === "taken@example.com") { const e = new Error("in use"); e.code = "auth/email-already-in-use"; throw e; }
  u.email = cred.email; u.isAnonymous = false; localStorage.removeItem("__guest"); localStorage.setItem("__linkedemail", cred.email); return { user: u };
};
