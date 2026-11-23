import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Some embedded browsers disable DOM storage. Keep temporary state in the page.
const temporarySession = new Map<string, string | null>();
const temporaryPreferences = new Map<string, string | null>();

export async function readStored(key: string, preference = false) {
  if (Platform.OS !== "web") return SecureStore.getItemAsync(key);
  if (typeof window === "undefined") return null;
  const temporary = preference ? temporaryPreferences : temporarySession;
  if (temporary.has(key)) return temporary.get(key) ?? null;
  try {
    return (preference ? window.localStorage : window.sessionStorage)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function writeStored(key: string, value: string, preference = false) {
  if (Platform.OS !== "web") return SecureStore.setItemAsync(key, value);
  const temporary = preference ? temporaryPreferences : temporarySession;
  try {
    (preference ? window.localStorage : window.sessionStorage).setItem(key, value);
    temporary.delete(key);
  } catch {
    temporary.set(key, value);
  }
}

export async function removeStored(key: string) {
  if (Platform.OS !== "web") return SecureStore.deleteItemAsync(key);
  try {
    window.sessionStorage.removeItem(key);
    temporarySession.delete(key);
  } catch {
    temporarySession.set(key, null);
  }
}
