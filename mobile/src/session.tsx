import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api, ApiError, errorMessage, type Snapshot } from "./api";

const key = "handyhive-session";
type Session = {
  token: string | null;
  snapshot: Snapshot | null;
  error: string;
  loading: boolean;
  restore: () => Promise<void>;
  login: (handle: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeBooking: (action: "request" | "transition", body: Record<string, string>) => Promise<string>;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const active = useRef<string | null>(null);
  const polling = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const apply = useCallback((credential: string, next: Snapshot) => {
    if (active.current !== credential) return;
    setSnapshot((current) => {
      if (current && (current.revision > next.revision ||
        (current.revision === next.revision && current.serverTime > next.serverTime))) return current;
      return next;
    });
    setError("");
  }, []);

  const clear = useCallback(async (credential: string) => {
    if (active.current !== credential) return;
    active.current = null;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSnapshot(null);
      setToken(null);
    }
  }, []);

  const refresh = useCallback(async (credential: string) => {
    if (polling.current || active.current !== credential) return;
    polling.current = true;
    try {
      apply(credential, await api<Snapshot>("state", credential));
    } catch (failure) {
      if (active.current !== credential) return;
      if (failure instanceof ApiError && failure.status === 401) {
        await clear(credential);
      }
      setError(errorMessage(failure));
    } finally {
      polling.current = false;
    }
  }, [apply, clear]);

  const restore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const credential = await SecureStore.getItemAsync(key);
      active.current = credential;
      setToken(credential);
      if (credential) await refresh(credential);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => { void restore(); }, [restore]);

  useEffect(() => {
    if (!token || loading) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh(token);
    }, 4000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh(token);
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [loading, refresh, token]);

  async function login(handle: string, password: string) {
    const next = await api<Snapshot & { session: { token: string } }>("login", undefined, { handle, password });
    const credential = next.session.token;
    await SecureStore.setItemAsync(key, credential);
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

  async function changeBooking(action: "request" | "transition", body: Record<string, string>) {
    const credential = active.current;
    if (!credential) throw new Error("Sign in to continue.");
    try {
      const next = await api<Snapshot & { jobId: string }>(action, credential, body);
      if (active.current !== credential) throw new Error("Sign in to continue.");
      apply(credential, next);
      return next.jobId;
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) await clear(credential);
      else if (failure instanceof ApiError && failure.status === 409) await refresh(credential);
      throw failure;
    }
  }

  return <SessionContext.Provider value={{ token, snapshot, error, loading, restore, login, logout, changeBooking }}>
    {children}
  </SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session provider is missing.");
  return session;
}
