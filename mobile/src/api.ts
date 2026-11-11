export type Account = { id: string; handle: string };
export type Hours = { days: number[]; start: string; end: string };
export type Profile = {
  id: string;
  name: string;
  service: string;
  bio: string;
  areas: string[];
  price: number;
  unit: "visit" | "hourly" | "fixed";
  hours?: Hours;
};
export type Booking = {
  id: string;
  customerId: string;
  proId: string;
  proName: string;
  scope: string;
  area: string;
  appointment: string;
  price: number;
  unit: Profile["unit"];
  deadline: number;
  status: "pending" | "accepted" | "expired" | "declined" | "cancelled" | "en_route" | "arrived" | "in_progress" | "completed";
};
export type Snapshot = {
  state: {
    account: Account; profile: Profile | null; profiles: Profile[]; requests: Booking[];
    catalog: { services: { id: string; name: string; tasks: string[] }[]; defaultHours: Hours };
  };
  revision: number;
  serverTime: number;
};

const base = process.env.EXPO_PUBLIC_HANDYHIVE_API_URL ?? (__DEV__ ? "http://10.0.2.2:4174/api/v1" : "");

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function api<T>(action: string, token?: string, body?: Record<string, string>): Promise<T> {
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
    if (response.status === 401) throw new ApiError(body && action === "login" ? "Check your username and password." : "Your session expired. Sign in again.", 401);
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error || "The server couldn’t complete this action.", response.status);
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Couldn’t reach HandyHive. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
