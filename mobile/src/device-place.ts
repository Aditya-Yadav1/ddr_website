import { Platform } from "react-native";
import { api } from "./api";
import { isPinCode } from "../shared/pin-codes";

export type VisitPlace = { pinCode: string; value: string };

export async function devicePlace(): Promise<VisitPlace | null> {
  if (Platform.OS === "web") {
    if (!navigator.geolocation) throw new Error("unavailable");
    const { coords } = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(error.code === 1 ? "denied" : "unavailable")), {
        enableHighAccuracy: true, timeout: 12000, maximumAge: 60000,
      });
    });
    const { place } = await api<{ place: VisitPlace | null }>("locations", undefined, {
      latitude: coords.latitude, longitude: coords.longitude,
    });
    return place;
  }
  const Location = await import("expo-location");
  if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error("denied");
  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const [address] = await Location.reverseGeocodeAsync(coords);
  if (!address || address.isoCountryCode?.toUpperCase() !== "IN" || !address.postalCode || !isPinCode(address.postalCode)) return null;
  return { pinCode: address.postalCode, value: [...new Set([address.district, address.city, address.region].filter(Boolean))].join(", ") };
}
