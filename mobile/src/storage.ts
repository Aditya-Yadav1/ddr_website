import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function readStored(key: string, preference = false) {
  if (Platform.OS !== "web") return SecureStore.getItemAsync(key);
  if (typeof window === "undefined") return null;
  return (preference ? window.localStorage : window.sessionStorage).getItem(key);
}

export async function writeStored(key: string, value: string, preference = false) {
  if (Platform.OS !== "web") return SecureStore.setItemAsync(key, value);
  (preference ? window.localStorage : window.sessionStorage).setItem(key, value);
}

export async function removeStored(key: string) {
  if (Platform.OS !== "web") return SecureStore.deleteItemAsync(key);
  window.sessionStorage.removeItem(key);
}
