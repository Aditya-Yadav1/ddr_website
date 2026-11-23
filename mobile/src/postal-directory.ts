import type { VisitPlace } from "./device-place";

let directory: Promise<string[]> | undefined;

export async function searchPostalDirectory(query: string): Promise<VisitPlace[]> {
  if (!directory) {
    directory = fetch((process.env.EXPO_BASE_URL || "") + "/locations/india.tsv").then(async (response) => {
      if (!response.ok) throw new Error("Postal directory unavailable");
      return (await response.text()).trim().split(/\r?\n/);
    }).catch((error) => { directory = undefined; throw error; });
  }
  const terms = query.trim().toLowerCase().replace(/bengaluru/g, "bangalore").split(/[\s,]+/).filter(Boolean);
  const matches: VisitPlace[] = [];
  const nearby: VisitPlace[] = [];
  for (const row of await directory) {
    const lower = row.toLowerCase().replace(/bengaluru/g, "bangalore");
    if (!terms.every((term) => lower.includes(term))) continue;
    const [name, district, state, pinCode] = row.split("\t");
    const bucket = name.toLowerCase().startsWith(terms[0]) || pinCode.startsWith(terms[0]) ? matches : nearby;
    if (bucket.length < 8) bucket.push({ value: [...new Set([name, district, state].filter(Boolean))].join(", "), pinCode });
    if (matches.length === 8) break;
  }
  return [...matches, ...nearby].slice(0, 8);
}
