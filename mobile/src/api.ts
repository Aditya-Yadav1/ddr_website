import { Platform } from "react-native";
import { resolveEndpoint } from "../api-endpoint";

export type WorkerTrust = {
  checks: Record<"identity" | "background" | "skills", { status: string; checkedAt?: number; expiresAt?: number }>;
  phoneVerified: boolean; suspended: boolean; requested: boolean; eligible: boolean; verifiedName: string | null;
};

export type Account = { id: string; handle: string };
export type Hours = { days: number[]; start: string; end: string; buffer: number };
export type Unit = "visit" | "hourly" | "fixed";
export type Tier = "everyday" | "plus";
export type Plus = { price: number; includes: string; includesHi?: string };
export type Profile = {
  sample?: boolean;
  workPhone?: string;
  trust?: WorkerTrust;
  id: string;
  name: string;
  service: string;
  bio: string;
  bioHi?: string;
  areas: string[];
  pinCodes?: string[];
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
  specializations?: string[];
};
export type Role = "customer" | "pro";
export type BookingUpdate = { id?: string; job: string; role: Role; label: string; created: number };
export type Materials = "customer" | "worker" | "none" | "inspect";
export type Brief = { problem: string; materials: Materials; readiness: "ready" | "not_ready" | "unknown" };
export type QuoteItem = { label: string; amountPaise: number };
export type Quote = {
  version: number; items: QuoteItem[]; creditPaise: number; totalPaise: number; minutes: number;
  materials: Exclude<Materials, "inspect">; exclusions: string; status: "sent" | "accepted" | "rejected" | "superseded";
};
export type Payment = {
  id: string; amountPaise: number; method: "cash" | "upi" | "other" | "online"; reportedBy: Role;
  source?: "demo" | "razorpay-test";
  status: "reported" | "confirmed" | "disputed" | "reversed"; at: number; reversalReason?: string;
};
export type HelpCase = {
  id: string; role: Role; category: "late" | "scope" | "payment" | "incomplete";
  message: string; at: number; status: "open" | "resolved"; endProposedBy?: Role;
  notes?: { role: Role; message: string; at: number }[];
};
export type SupportTicket = {
  id: string; job: string; category: "booking" | "payment" | "account" | "other";
  message: string; created: number; status: "open" | "resolved"; response: string;
};
export type WorkerRating = { pro: string; rating: number; count: number };
export type WorkerDetails = { workPhone: string; reviews: { rating: number; comment: string; created: number }[] };
export type Booking = {
  demoWorker?: boolean;
  safetyVersion?: number;
  arrivalConfirmedAt?: number;
  workerTrust?: WorkerTrust | null;
  id: string;
  customerId: string;
  proId: string;
  proName: string;
  service: string;
  scope: string;
  area: string;
  pinCode?: string;
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
  agreementVersion?: 1;
  brief?: Brief;
  basePaise?: number;
  agreedHours?: number;
  activeQuote?: number;
  quotes?: Quote[];
  bill?: { totalPaise: number; quoteVersion: number | null; at: number };
  diagnosticOnly?: boolean;
  payments?: Payment[];
  checkout?: { mode: "demo" | "razorpay-test"; amountPaise: number; reference?: string; url?: string };
  reschedule?: { version: number; appointment: string; minutes: number; reason: string; role: Role; status: "pending" | "accepted" | "rejected" | "expired"; expires: number };
  cancellation?: { role: Role; reason: string; at: number };
  delay?: { minutes: number; at: number };
  helpCases?: HelpCase[];
  interrupted?: boolean;
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
    requireVerification?: boolean;
    demoPinCode?: string;
    onlinePaymentMode?: "demo" | "razorpay-test" | null;
    safetyReports?: { id: string; job: string; worker?: string; message: string; created: number; status: string; resolution: string }[];
    supportTickets?: SupportTicket[];
    blockedWorkers?: { id: string; name: string }[];
    addresses?: { label: string; area: string; pinCode?: string; address: string; customerName: string; landmark: string }[];
    reviewed?: string[];
    ratings?: WorkerRating[];
    account: Account; profile: Profile | null; profiles: Profile[]; requests: Booking[];
    popular?: { service: string; scope: string; pinCode: string; count: number }[];
    bookingUpdates?: BookingUpdate[];
    savedWorkers?: string[];
    catalog: Catalog;
    matches: { pinCode: string; appointment: string; timing: string; ids: string[] } | null;
  };
  revision: number;
  serverTime: number;
};
type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
export type Payload = Record<string, Json | undefined>;
export type BookingCommand = "request" | "transition" | "message" | "estimate" | "quote-send" | "quote-respond"
  | "payment-report" | "payment-confirm" | "payment-reverse" | "reschedule-propose" | "reschedule-respond"
  | "report-delay" | "help-create" | "help-respond" | "arrival-confirm" | "safety-report" | "demo-worker-step";
export type ProfileCommand = "profile" | "hours" | "published" | "immediate" | "block" | "remove-block" | "save-address" | "remove-address" | "review" | "save-worker" | "remove-worker" | "verification-request"
  | "block-worker" | "unblock-worker" | "report-worker"
  | "checkout-start" | "checkout-check" | "checkout-demo" | "checkout-cancel" | "support-create";

const pilotMode = process.env.EXPO_PUBLIC_HANDYHIVE_PILOT;
export const offlineDemo = process.env.EXPO_PUBLIC_HANDYHIVE_OFFLINE_DEMO === "1";
export const usbPilotBuild = pilotMode === "usb";
export const pilotBuild = usbPilotBuild || pilotMode === "1";
export function apiEndpoint() {
  return resolveEndpoint(process.env.EXPO_PUBLIC_HANDYHIVE_API_URL, Platform.OS, __DEV__, usbPilotBuild ? "usb" : pilotBuild);
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

export async function api<T>(action: string, token?: string, body?: Payload): Promise<T> {
  if (process.env.EXPO_PUBLIC_HANDYHIVE_OFFLINE_DEMO === "1") {
    const { requestDemo } = require("../demo/client") as typeof import("../demo/client");
    try {
      return await requestDemo(action, token, body) as T;
    } catch (error) {
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        throw new ApiError(error.message, error.status, "code" in error ? String(error.code) : "DEMO_ERROR");
      }
      throw new ApiError("Could not read or save this phone's demo data. Check the device storage and try again.", 500, "DEMO_STORAGE");
    }
  }
  const base = apiEndpoint();
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
      redirect: "error",
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new ApiError("The server returned a webpage instead of the HandyHive API. Check the deployment address.", 502, "INVALID_SERVER_RESPONSE");
    }
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error || "The server could not complete this action.", response.status, result.code);
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new Error("HandyHive took too long to respond. Please try again.");
    if (usbPilotBuild) throw new Error("Cannot reach the USB pilot server. Connect the phone by USB and run the USB launcher on the computer.");
    throw new Error(pilotBuild
      ? "Cannot reach the pilot server. Keep the computer running and connect this phone to the same Wi-Fi."
      : "Could not reach HandyHive. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
