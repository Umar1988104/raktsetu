import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // { user, donor } from /api/auth/me
  const [loading, setLoading] = useState(true);

  const [profileError, setProfileError] = useState(false); // true = couldn't reach the server (NOT "no profile")

  // Loads the RaktSetu profile. Only a 404 means "this account has no profile
  // yet". Any other failure (server waking up, flaky network) is retried and,
  // if it still fails, flagged — so a hiccup never dumps a registered user
  // onto the "Tell us a bit about you" page.
  async function refreshProfile() {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await api.get("/api/auth/me");
        setProfile(data);
        setProfileError(false);
        return data;
      } catch (err) {
        if (err.status === 404) {
          setProfile(null); // genuinely not registered yet — frontend routes to /complete-profile
          setProfileError(false);
          return null;
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
    setProfileError(true);
    return null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setLoading(true); // hold the app on the loader until the profile is known
        await refreshProfile();
      } else {
        setProfile(null);
        setProfileError(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signup(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Wait for the profile BEFORE the caller navigates, so the route guard
    // never sees "logged in, but no profile yet".
    setFirebaseUser(cred.user);
    setLoading(true);
    await refreshProfile();
    setLoading(false);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  // Call after signup once the user fills in name/phone/role.
  async function completeProfile({ name, phone, role, hospitalName }) {
    const data = await api.post("/api/auth/register", { name, phone, role, hospitalName });
    await refreshProfile();
    return data;
  }

  const value = {
    firebaseUser,
    profile,
    profileError,
    loading,
    signup,
    login,
    logout,
    completeProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
