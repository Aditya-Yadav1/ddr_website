import { useEffect, useState } from "react";
import { api, type Snapshot } from "./api";
import { useSession } from "./session";

export function useDiscovery() {
  const session = useSession();
  const [publicState, setPublicState] = useState<Snapshot | null>(null);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (session.token) return;
    let active = true;
    api<Snapshot>("discover").then((next) => { if (active) { setPublicState(next); setError(null); } })
      .catch((failure) => { if (active) setError(failure); });
    return () => { active = false; };
  }, [session.token, attempt]);
  return { snapshot: session.token ? session.snapshot : publicState, error: session.token ? session.error : error,
    retry: () => setAttempt((value) => value + 1) };
}
