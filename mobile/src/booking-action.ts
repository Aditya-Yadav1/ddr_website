import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ApiError, type BookingCommand, type Payload } from "./api";
import { useSession } from "./session";

export function useBookingAction() {
  const { changeBooking } = useSession();
  const operation = useRef<{ signature: string; id: string } | null>(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function send(action: BookingCommand, payload: Payload) {
    if (sending.current) return;
    const signature = JSON.stringify([action, payload]);
    if (uncertain && operation.current?.signature !== signature) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    if (operation.current?.signature !== signature) operation.current = { signature, id: randomUUID() };
    try {
      const jobId = await changeBooking(action, { ...payload, operationId: operation.current.id });
      operation.current = null;
      setUncertain(false);
      return jobId;
    } catch (failure) {
      setUncertain(!(failure instanceof ApiError) || failure.status >= 500);
      setError(failure);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return { send, busy, error, uncertain };
}
