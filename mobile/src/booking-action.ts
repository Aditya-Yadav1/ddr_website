import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { errorMessage } from "./api";
import { useSession } from "./session";

export function useBookingAction() {
  const { changeBooking } = useSession();
  const operation = useRef<{ signature: string; id: string } | null>(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(action: "request" | "transition", payload: Record<string, string>) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const signature = JSON.stringify([action, payload]);
    if (operation.current?.signature !== signature) operation.current = { signature, id: randomUUID() };
    try {
      return await changeBooking(action, { ...payload, operationId: operation.current.id });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return { send, busy, error };
}
