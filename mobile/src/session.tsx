import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { api, ApiError, type BookingCommand, type Payload, type PhoneChallenge, type ProfileCommand, type Snapshot } from "./api";
import { readStored, removeStored, writeStored } from "./storage";

const key = "handyhive-session";
type Session = {
  token: string | null;
  snapshot: Snapshot | null;
  error: unknown;
  loading: boolean;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  auth: (action: "login" | "register" | "phone-verify", body: Payload) => Promise<void>;
  startPhone: (phone: string) => Promise<PhoneChallenge>;
  logout: () => Promise<void>;
  changeBooking: (action: BookingCommand, body: Payload) => Promise<string>;
  changeProfile: (action: ProfileCommand, body: Payload) => Promise<void>;
  checkSlots: (area: string, appointments: string[], proId: string, immediate: boolean) => Promise<{ slots: string[]; immediate: boolean }>;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const active = useRef<string | null>(null);
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
      const credential = await readStored(key);
      active.current = credential;
      setToken(credential);
      if (credential) await refresh(credential);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => { void restore(); }, [restore]);

  useEffect(() => {
    if (!token || loading) return;
    const isActive = () => Platform.OS === "web" ? !document.hidden : AppState.currentState === "active";
    const refreshIfActive = () => { if (isActive()) void refresh(token); };
    const timer = setInterval(refreshIfActive, 4000);
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

  async function auth(action: "login" | "register" | "phone-verify", body: Payload) {
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
    await api("logout", credential, {});
    await clear(credential);
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

  const checkSlots = useCallback(async (area: string, appointments: string[], proId: string, immediate: boolean) => {
    const credential = active.current;
    if (!credential) throw new Error("Sign in to continue.");
    const query = new URLSearchParams({ area, proId, timing: immediate ? "now" : "" });
    for (const appointment of appointments) query.append("slot", appointment);
    const results = await api<{ slots: string[]; immediate: boolean }>("slots?" + query, credential);
    if (active.current !== credential) throw new Error("Sign in to continue.");
    return results;
  }, []);

  return <SessionContext.Provider value={{
    token, snapshot, error, loading, restore, refresh, auth, logout, checkSlots,
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
