import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { ApiError, type BookingCommand, type Payload } from "./api";
import { useSession } from "./session";
import { readStored, removeStored, writeStored } from "./storage";

type Operation = { action: BookingCommand; payload: Payload; signature: string; id: string };

export function useBookingAction(persistFor?: string) {
  const { changeBooking, snapshot } = useSession();
  const account = snapshot?.state.account.id;
  const key = persistFor && account ? "handyhive-operation." + account + "." + persistFor : "";
  const operation = useRef<Operation | null>(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [restored, setRestored] = useState("");

  useEffect(() => {
    if (!key) return;
    let active = true;
    operation.current = null;
    setUncertain(false);
    setError(null);
    void readStored(key).then((saved) => {
      if (!active || !saved) return;
      operation.current = JSON.parse(saved) as Operation;
      setUncertain(true);
    }).catch(() => {}).finally(() => { if (active) setRestored(key); });
    return () => { active = false; };
  }, [key]);

  const loading = Boolean(key && restored !== key);
  async function send(action: BookingCommand, payload: Payload) {
    if (sending.current || loading) return;
    const signature = JSON.stringify([action, payload]);
    if (uncertain && operation.current?.signature !== signature) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    if (operation.current?.signature !== signature) operation.current = { action, payload, signature, id: randomUUID() };
    try {
      const intent = operation.current;
      if (key) await writeStored(key, JSON.stringify(intent));
      const jobId = await changeBooking(action, { ...payload, operationId: intent.id });
      operation.current = null;
      if (key) await removeStored(key).catch(() => {});
      setUncertain(false);
      return jobId;
    } catch (failure) {
      const retry = !(failure instanceof ApiError) || failure.status >= 500;
      setUncertain(retry);
      if (!retry && key) await removeStored(key).catch(() => {});
      setError(failure);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return { send, busy: busy || loading, error, uncertain, retry: () => {
    const intent = operation.current;
    if (intent) return send(intent.action, intent.payload);
  } };
}
