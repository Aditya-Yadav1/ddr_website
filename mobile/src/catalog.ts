type CatalogTask = { id: string; service: string; name: string; hi: string; task: string; taskHi: string; aliases: string[]; legacy: boolean };
type CatalogService = { id: string; name: string; hi: string; note: string; noteHi: string; icon: string; terms: string[]; tasks: string[] };
const catalog = require("../shared/service-catalog") as { tasks: CatalogTask[]; services: CatalogService[] };
export const tasks = catalog.tasks;
export const services = catalog.services;
export const taskGroups: Record<string, CatalogTask[]> = Object.fromEntries(services.map((service) => [service.id, tasks.filter((task) => task.service === service.id)]));
export function matchingTasks(query: string, service?: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  const candidates = tasks.filter((task) => !service || service === "all" || task.service === service);
  if (!words.length) return candidates;
  return candidates.map((task) => {
    const category = services.find((item) => item.id === task.service);
    const terms = [task.task, task.taskHi, task.name, task.hi, category?.name || "", category?.hi || "", ...task.aliases].map((term) => term.toLocaleLowerCase());
    const scores = words.map((word) => terms.reduce((best, term) => Math.max(best, term === word ? 4 : term.startsWith(word) ? 3 : term.includes(word) ? 2 : 0), 0));
    return { task, score: scores.every(Boolean) ? scores.reduce((sum, value) => sum + value, 0) : 0 };
  }).filter(({ score }) => score).sort((a, b) => b.score - a.score || a.task.id.localeCompare(b.task.id)).map(({ task }) => task);
}
