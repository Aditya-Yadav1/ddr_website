import type { Hours, Profile } from "./api";

export function appointmentDays(serverTime: number, hours: Hours) {
  const todayInIndia = serverTime + 19_800_000;
  return Array.from({ length: 7 }, (_, offset) => new Date(todayInIndia + (offset + 1) * 86_400_000))
    .filter((day) => hours.days.includes(day.getUTCDay()))
    .map((day) => day.toISOString().slice(0, 10));
}

export function appointmentTimes(hours: Hours, unit: Profile["unit"]) {
  const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
  const options = [];
  const duration = unit === "hourly" ? 120 : 60;
  const close = minutes(hours.end);
  for (let start = minutes(hours.start); start + duration <= close; start += 60) {
    options.push(String(Math.floor(start / 60)).padStart(2, "0") + ":" + String(start % 60).padStart(2, "0"));
  }
  return options;
}
