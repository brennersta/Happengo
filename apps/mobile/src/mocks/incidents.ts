import type { components } from "@happengo/api-client";

type Incident = components["schemas"]["IncidentResponse"];
export type CreateIncident = components["schemas"]["CreateIncidentRequest"];
type Vote = Exclude<components["schemas"]["IncidentVoteValue"], null>;
const now = Date.now();
const fixtureBase = {
  description: "Smoke is visible above the rooftops. Emergency services have been notified.",
  longitude: 24.743, latitude: 59.437, address: "Kesklinn, Tallinn",
  createdAt: new Date(now - 18 * 60_000).toISOString(),
  lastConfirmedAt: new Date(now - 4 * 60_000).toISOString(),
  closedAt: null, closeReason: null, isActive: true, stillThereCount: 4, goneCount: 0,
  myVote: null, isReporter: false,
} satisfies Omit<Incident, "id" | "category">;
const records: Incident[] = [
  { ...fixtureBase, id: "00000000-0000-4000-8000-000000000201", category: "fire", longitude: 24.743, isReporter: true },
  { ...fixtureBase, id: "00000000-0000-4000-8000-000000000202", category: "traffic_collision", description: "Two vehicles stopped after a collision. Traffic is moving slowly.", longitude: 24.765, latitude: 59.444, address: "Narva maantee, Tallinn", createdAt: new Date(now - 42 * 60_000).toISOString(), lastConfirmedAt: new Date(now - 20 * 60_000).toISOString(), stillThereCount: 2 },
  { ...fixtureBase, id: "00000000-0000-4000-8000-000000000203", category: "other", description: "A large fallen branch is blocking part of the footpath.", longitude: 24.728, latitude: 59.431, address: "Kadriorg, Tallinn", stillThereCount: 1 },
];
let nextId = 301;

export function listDemoIncidents(bbox: string | null): Incident[] {
  const bounds = parseBbox(bbox);
  return records.filter((item) => item.isActive && (!bounds || (item.longitude >= bounds[0] && item.longitude <= bounds[2] && item.latitude >= bounds[1] && item.latitude <= bounds[3])));
}
export function getDemoIncident(id: string): Incident | null { return records.find((item) => item.id === id) ?? null; }
export function createDemoIncident(request: CreateIncident, date = new Date()): Incident | null {
  if (!request.description.trim() || request.description.length > 500 || !request.address.trim()) return null;
  const record: Incident = {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    category: request.category, description: request.description, longitude: request.longitude, latitude: request.latitude, address: request.address,
    createdAt: date.toISOString(), lastConfirmedAt: date.toISOString(), closedAt: null, closeReason: null, isActive: true,
    stillThereCount: 0, goneCount: 0, myVote: null, isReporter: true,
  };
  records.unshift(record);
  return record;
}
export function voteDemoIncident(id: string, vote: Vote): Incident | null {
  const record = getDemoIncident(id);
  if (!record || !record.isActive) return null;
  if (record.myVote === "still_there") record.stillThereCount -= 1;
  if (record.myVote === "gone") record.goneCount -= 1;
  if (vote === "still_there") record.stillThereCount += 1;
  else record.goneCount += 1;
  record.myVote = vote;
  record.lastConfirmedAt = new Date().toISOString();
  if (record.goneCount > record.stillThereCount && record.goneCount >= 2) {
    record.isActive = false;
    record.closedAt = new Date().toISOString();
    record.closeReason = "community";
  }
  return record;
}
export function closeDemoIncident(id: string): Incident | null {
  const record = getDemoIncident(id);
  if (!record || !record.isActive || !record.isReporter) return null;
  record.isActive = false;
  record.closedAt = new Date().toISOString();
  record.closeReason = "reporter";
  return record;
}

function parseBbox(value: string | null): [number, number, number, number] | null {
  if (!value) return null;
  const result = value.split(",").map(Number);
  const minLng = result[0];
  const minLat = result[1];
  const maxLng = result[2];
  const maxLat = result[3];
  return result.length === 4 && minLng !== undefined && minLat !== undefined && maxLng !== undefined && maxLat !== undefined
    && result.every(Number.isFinite) ? [minLng, minLat, maxLng, maxLat] : null;
}
