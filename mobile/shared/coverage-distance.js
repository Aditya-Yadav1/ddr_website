"use strict";

function areaPoint(value, decimals = 3) {
  const { latitude, longitude } = value ?? {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < 6 || latitude > 38 || longitude < 68 || longitude > 98) return null;
  return { latitude: Number(latitude.toFixed(decimals)), longitude: Number(longitude.toFixed(decimals)) };
}

function distanceKm(start, end) {
  const radians = Math.PI / 180;
  const latitudeDifference = (end.latitude - start.latitude) * radians;
  const longitudeDifference = (end.longitude - start.longitude) * radians;
  const chord = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(start.latitude * radians) * Math.cos(end.latitude * radians) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, chord)));
}

module.exports = { areaPoint, distanceKm, defaultRadiusKm: 12 };
