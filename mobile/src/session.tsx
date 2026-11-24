import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { api, ApiError, offlineDemo, type BookingCommand, type Payload, type PhoneChallenge, type ProfileCommand, type Snapshot } from "./api";
import { readStored, removeStored, writeStored } from "./storage";

const key = offlineDemo ? "handyhive-offline-session" : "handyhive-session";
type AuthCommand = "login" | "register" | "phone-verify" | "demo-sign-in" | "google-sign-in";
type Session = {
  role: "customer" | "worker";
  chooseRole: (role: "customer" | "worker") => Promise<void>;
  token: string | null;
  snapshot: Snapshot | null;
  error: unknown;
  loading: boolean;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  auth: (action: AuthCommand, body: Payload) => Promise<void>;
  startPhone: (phone: string) => Promise<PhoneChallenge>;
  logout: () => Promise<void>;
  changeBooking: (action: BookingCommand, body: Payload) => Promise<string>;
  changeProfile: (action: ProfileCommand, body: Payload) => Promise<void>;
  checkSlots: (pinCode: string, appointments: string[], proId: string, immediate: boolean, scope?: string, hours?: number) => Promise<{ slots: string[]; immediate: boolean }>;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const active = useRef<string | null>(null);
  const [role, setRole] = useState<"customer" | "worker">("customer");
  async function chooseRole(value: "customer" | "worker") {
    await writeStored(key + "-role", value);
    setRole(value);
  }
  const polling = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((credential: string, next: Snapshot) => {
    if (active.current !== credential) return;
    setSnapshot((current) => {
      if (current && (current.revision > next.revision ||
        (current.revision === next.revision && current.serverTime > next.serverTime))) return current;
      return next;
    });
    setError(null);
  }, []);

  const clear = useCallback(async (credential: string) => {
    if (active.current !== credential) return;
    active.current = null;
    try {
      await removeStored(key);
    } finally {
      setSnapshot(null);
      setToken(null);
    }
  }, []);

  const refresh = useCallback(async (credential = active.current) => {
    if (!credential || polling.current === credential || active.current !== credential) return;
    polling.current = credential;
    try {
      apply(credential, await api<Snapshot>("state", credential));
    } catch (failure) {
      if (active.current !== credential) return;
      if (failure instanceof ApiError && failure.status === 401) await clear(credential).catch(() => {});
      setError(failure);
    } finally {
      if (polling.current === credential) polling.current = null;
    }
  }, [apply, clear]);

  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let credential = await readStored(key);
      setRole(await readStored(key + "-role") === "worker" ? "worker" : "customer");
      active.current = credential;
      setToken(credential);
      if (credential) await refresh(credential);
      if (Platform.OS === "web" && !offlineDemo) {
        try {
          const settings = await api<{ firebase?: { apiKey: string; authDomain: string; projectId: string; appId: string } | null }>("config");
          if (settings.firebase) {
            const { configureGoogle, resumeGoogle } = await import("./google-auth");
            configureGoogle(settings.firebase);
            const idToken = !active.current ? await resumeGoogle() : null;
            if (idToken) {
              const next = await api<Snapshot & { session: { token: string } }>("google-sign-in", undefined, { idToken });
              credential = next.session.token;
              await writeStored(key, credential);
              active.current = credential;
              apply(credential, next);
              setToken(credential);
            }
          }
        } catch { /* Phone sign-in remains available when Google restoration is unavailable. */ }
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [refresh, apply]);

  useEffect(() => { void restore(); }, [restore]);

  useEffect(() => {
    if (!token || loading) return;
    const isActive = () => Platform.OS === "web" ? !document.hidden : AppState.currentState === "active";
    const refreshIfActive = () => { if (isActive()) void refresh(token); };
    const timer = setInterval(refreshIfActive, 20000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshIfActive();
    });
    if (Platform.OS === "web") {
      window.addEventListener("online", refreshIfActive);
      document.addEventListener("visibilitychange", refreshIfActive);
    }
    return () => {
      clearInterval(timer);
      listener.remove();
      if (Platform.OS === "web") {
        window.removeEventListener("online", refreshIfActive);
        document.removeEventListener("visibilitychange", refreshIfActive);
      }
    };
  }, [loading, refresh, token]);

  async function auth(action: AuthCommand, body: Payload) {
    const next = await api<Snapshot & { session: { token: string } }>(action, undefined, body);
    const credential = next.session.token;
    await writeStored(key, credential);
    active.current = credential;
    apply(credential, next);
    setToken(credential);
  }

  async function logout() {
    const credential = active.current;
    if (!credential) return;
    try { await api("logout", credential, {}); }
    catch { /* Clear local credentials even when offline; server sessions expire. */ }
    await clear(credential);
    if (Platform.OS === "web") {
      const { signOutGoogle } = await import("./google-auth");
      await signOutGoogle().catch(() => {});
    }
  }

  async function mutate(action: BookingCommand | ProfileCommand, body: Payload) {
    const credential = active.current;
    if (!credential) throw new Error("Sign in to continue.");
    try {
      const next = await api<Snapshot & { jobId: string }>(action, credential, body);
      if (active.current !== credential) throw new Error("Sign in to continue.");
      apply(credential, next);
      return next;
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) await clear(credential).catch(() => {});
      else if (failure instanceof ApiError && failure.status === 409) await refresh(credential);
      throw failure;
    }
  }

  const checkSlots = useCallback(async (pinCode: string, appointments: string[], proId: string, immediate: boolean, scope = "", hours = 2) => {
    const credential = active.current;
    if (!credential) throw new Error("Sign in to continue.");
    const query = new URLSearchParams({ pinCode, proId, timing: immediate ? "now" : "", scope, hours: String(hours) });
    for (const appointment of appointments) query.append("slot", appointment);
    const results = await api<{ slots: string[]; immediate: boolean }>("slots?" + query, credential);
    if (active.current !== credential) throw new Error("Sign in to continue.");
    return results;
  }, []);

  return <SessionContext.Provider value={{
    role, chooseRole, token, snapshot, error, loading, restore, refresh, auth, logout, checkSlots,
    startPhone: (phone) => api<PhoneChallenge>("phone-start", undefined, { phone }),
    changeBooking: async (action, body) => (await mutate(action, body)).jobId,
    changeProfile: async (action, body) => { await mutate(action, body); },
  }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session provider is missing.");
  return session;
}
