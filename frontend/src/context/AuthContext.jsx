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

  async function refreshProfile() {
    try {
      const data = await api.get("/api/auth/me");
      setProfile(data);
    } catch {
      setProfile(null); // not registered yet — frontend will route to /complete-profile
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshProfile();
      } else {
        setProfile(null);
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
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  // Call after signup once the user fills in name/phone/role.
  async function completeProfile({ name, phone, role }) {
    const data = await api.post("/api/auth/register", { name, phone, role });
    await refreshProfile();
    return data;
  }

  const value = {
    firebaseUser,
    profile,
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
