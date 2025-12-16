import type {
  JolpicaRacesResponse,
  JolpicaRace,
  JolpicaRaceResultsResponse,
  JolpicaResult,
} from "../types/f1";

const BASE = "https://api.jolpi.ca/ergast/f1"; // Ergast-compatible Jolpica base :contentReference[oaicite:1]{index=1}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getSeasonRaces(year: number): Promise<JolpicaRace[]> {
  const url = `${BASE}/${year}.json`;
  const data = await fetchJson<JolpicaRacesResponse>(url);
  return data.MRData.RaceTable.Races ?? [];
}

export async function getRace(year: number, round: number): Promise<JolpicaRace | null> {
  const url = `${BASE}/${year}/${round}.json`;
  const data = await fetchJson<JolpicaRacesResponse>(url);
  return data.MRData.RaceTable.Races?.[0] ?? null;
}

// Race results endpoint: /f1/{season}/{round}/results.json :contentReference[oaicite:2]{index=2}
export async function getRaceResults(
  year: number,
  round: number
): Promise<{ raceName: string; results: JolpicaResult[] } | null> {
  const url = `${BASE}/${year}/${round}/results.json`;
  const data = await fetchJson<JolpicaRaceResultsResponse>(url);
  const race = data.MRData.RaceTable.Races?.[0];
  if (!race) return null;
  return { raceName: race.raceName, results: race.Results ?? [] };
}

export function raceStartLocal(r: { date: string; time?: string }): Date {
  const iso = r.time ? `${r.date}T${r.time}` : `${r.date}T00:00:00Z`;
  return new Date(iso);
}
