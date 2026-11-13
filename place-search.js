"use strict";

const fold = (value) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const aliases = { Saket: "साकेत", Dwarka: "द्वारका", Rohini: "रोहिणी", "Lajpat Nagar": "लाजपत नगर" };

module.exports = function createPlaceSearch({ fetch: fetchPlaces = globalThis.fetch, endpoint = "https://photon.komoot.io/api/" } = {}) {
  const cache = new Map();
  let active = 0;

  async function remote(query) {
    const key = fold(query);
    const saved = cache.get(key);
    if (saved && saved.expires > Date.now()) return saved.result;
    if (active >= 4) return { suggestions: [], unavailable: true };
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    const result = lookup(query);
    cache.set(key, { expires: Date.now() + 300000, result });
    const response = await result;
    if (response.unavailable && cache.get(key)?.result === result) cache.delete(key);
    return response;
  }

  async function lookup(query) {
    active++;
    try {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ q: query, limit: "6", lang: "en", countrycode: "in", lat: "28.6139", lon: "77.2090" }).toString();
      for (const layer of ["locality", "district", "city", "street"]) url.searchParams.append("layer", layer);
      const response = await fetchPlaces(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error("Place lookup unavailable");
      const data = await response.json();
      if (!Array.isArray(data.features)) throw new Error("Invalid place response");
      const suggestions = data.features.slice(0, 6).flatMap((feature) => {
        const place = feature?.properties;
        if (typeof place?.name !== "string" || !place.name.trim() || (place.countrycode && place.countrycode.toLowerCase() !== "in")) return [];
        const parts = [place.name, place.city || place.county, place.state].filter((part) => typeof part === "string" && part.trim());
        const distinct = [...new Map(parts.map((part) => [fold(part), part.trim()])).values()];
        const value = distinct.join(", ");
        if (value.length > 120) return [];
        return [{ id: "place-" + (place.osm_type || "") + (place.osm_id || value), name: distinct[0],
          description: distinct.slice(1).join(", "), value, source: "photon" }];
      });
      return { suggestions, unavailable: false };
    } catch {
      return { suggestions: [], unavailable: true };
    } finally {
      active--;
    }
  }

  return async function searchPlaces(query, areas) {
    const wanted = fold(query);
    const local = [...new Set(areas)].filter((area) => fold(area + " " + (aliases[area] || "")).includes(wanted))
      .slice(0, 6).map((area) => ({ id: "area-" + area, name: area, description: "", value: area, source: "coverage" }));
    const response = await remote(query);
    const seen = new Set();
    const suggestions = [...local, ...response.suggestions].filter((place) => {
      const key = fold(place.value).replace(/,?\s*(?:new delhi|delhi)(?:,?\s*india)?$/, "").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
    return { suggestions, unavailable: response.unavailable };
  };
};
