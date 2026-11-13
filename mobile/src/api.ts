import { Platform } from "react-native";

export type Account = { id: string; handle: string };
export type Hours = { days: number[]; start: string; end: string; buffer: number };
export type Unit = "visit" | "hourly" | "fixed";
export type Tier = "everyday" | "plus";
export type Plus = { price: number; includes: string; includesHi?: string };
export type Profile = {
  id: string;
  name: string;
  service: string;
  bio: string;
  bioHi?: string;
  areas: string[];
  price: number;
  unit: Unit;
  years: number;
  languages?: string[];
  credential?: string;
  hours?: Hours;
  blocks?: { id: string; start: string; end: string }[];
  immediate?: boolean;
  published: boolean;
  plus?: Plus | null;
};
export type Role = "customer" | "pro";
export type BookingUpdate = { job: string; role: Role; label: string; created: number };
export type Booking = {
  id: string;
  customerId: string;
  proId: string;
  proName: string;
  service: string;
  scope: string;
  area: string;
  appointment: string;
  timing?: "" | "now";
  tier: Tier;
  price: number;
  unit: Unit;
  minimumQuantity: number;
  includes?: string;
  includesHi?: string;
  duration: number;
  createdAt: number;
  updatedAt: number;
  deadline: number;
  details?: { customerName: string; address: string; landmark: string; notes: string };
  messages: { role: Role; message: string; time: number }[];
  status: "pending" | "accepted" | "expired" | "declined" | "cancelled" | "en_route" | "arrived" | "in_progress" | "completed";
};
export type Catalog = {
  areas: string[];
  services: { id: string; name: string; note: string; tasks: string[] }[];
  defaultHours: Hours;
};
export type PhoneMode = "preview" | "twilio";
export type PlaceSuggestion = { id: string; name: string; description: string; value: string; source: "coverage" | "photon" };
export type PhoneChallenge = { challenge: string; expiresAt: number; previewCode?: string };
export type Snapshot = {
  state: {
    account: Account; profile: Profile | null; profiles: Profile[]; requests: Booking[];
    bookingUpdates?: BookingUpdate[];
    catalog: Catalog;
    matches: { area: string; appointment: string; timing: string; ids: string[] } | null;
  };
  revision: number;
  serverTime: number;
};
type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
export type Payload = Record<string, Json | undefined>;
export type BookingCommand = "request" | "transition" | "message" | "estimate";
export type ProfileCommand = "profile" | "hours" | "published" | "immediate" | "block" | "remove-block";

const base = process.env.EXPO_PUBLIC_HANDYHIVE_API_URL
  ?? (Platform.OS === "web" ? "/api/v1" : __DEV__ ? "http://10.0.2.2:4174/api/v1" : "");

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

export async function api<T>(action: string, token?: string, body?: Payload): Promise<T> {
  if (!base) throw new Error("The app has no server configured.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(base.replace(/\/$/, "") + "/" + action, {
      method: body ? "POST" : "GET",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error || "The server could not complete this action.", response.status, result.code);
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Could not reach HandyHive. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
