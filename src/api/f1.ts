import type { JolpicaRacesResponse, JolpicaRace } from "../types/f1";

const BASE = "https://api.jolpi.ca/ergast/f1"; // Ergast-compatible base :contentReference[oaicite:1]{index=1}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export async function getSeasonRaces(year: number): Promise<JolpicaRace[]> {
  const url = `${BASE}/${year}.json`;
  const data = await fetchJson<JolpicaRacesResponse>(url);
  return data.MRData.RaceTable.Races ?? [];
}

// Converts Jolpica date/time to a JS Date (shown in local browser time)
export function raceStartLocal(r: JolpicaRace): Date {
  // Ergast-style time is usually UTC with "Z" (e.g., 14:00:00Z)
  const iso = r.time ? `${r.date}T${r.time}` : `${r.date}T00:00:00Z`;
  return new Date(iso);
}
