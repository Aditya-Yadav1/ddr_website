import { Platform } from "react-native";
import { api } from "./api";
import { isPinCode } from "../shared/pin-codes";

export type VisitPlace = { pinCode: string; value: string };
export type GpsFix = { latitude: number; longitude: number; accuracy: number };

export const canUseGps = () => Platform.OS !== "web" || Boolean(globalThis.isSecureContext && navigator.geolocation);

export async function deviceFix(): Promise<GpsFix> {
  if (Platform.OS === "web") {
    if (!navigator.geolocation) throw new Error("unavailable");
    const { coords } = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(error.code === 1 ? "denied" : "unavailable")), {
        enableHighAccuracy: true, timeout: 12000, maximumAge: 0,
      });
    });
    return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
  }
  const Location = await import("expo-location");
  if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error("denied");
  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  if (!coords.accuracy || coords.accuracy < 0) throw new Error("unavailable");
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
}

export async function devicePlace(coords: GpsFix): Promise<VisitPlace | null> {
  if (Platform.OS === "web") {
    // Postal-area lookup only needs neighbourhood-level coordinates.
    const { place } = await api<{ place: VisitPlace | null }>("locations", undefined, {
      latitude: Number(coords.latitude.toFixed(3)), longitude: Number(coords.longitude.toFixed(3)),
    });
    return place;
  }
  const Location = await import("expo-location");
  const [address] = await Location.reverseGeocodeAsync(coords);
  if (!address || address.isoCountryCode?.toUpperCase() !== "IN" || !address.postalCode || !isPinCode(address.postalCode)) return null;
  return { pinCode: address.postalCode, value: [...new Set([address.district, address.city, address.region].filter(Boolean))].join(", ") };
}
