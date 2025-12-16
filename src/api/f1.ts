import type {
  JolpicaRacesResponse,
  JolpicaRace,
  JolpicaRaceResultsResponse,
  JolpicaResult,
  JolpicaDriverStandingsResponse,
  JolpicaDriverStanding,
  JolpicaConstructorStandingsResponse,
  JolpicaConstructorStanding,
} from "../types/f1";

const BASE = "https://api.jolpi.ca/ergast/f1";

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

export async function getDriverStandings(year: number): Promise<JolpicaDriverStanding[]> {
  const url = `${BASE}/${year}/driverStandings.json`;
  const data = await fetchJson<JolpicaDriverStandingsResponse>(url);
  const list = data.MRData.StandingsTable.StandingsLists?.[0];
  return list?.DriverStandings ?? [];
}

export async function getConstructorStandings(
  year: number
): Promise<JolpicaConstructorStanding[]> {
  const url = `${BASE}/${year}/constructorStandings.json`;
  const data = await fetchJson<JolpicaConstructorStandingsResponse>(url);
  const list = data.MRData.StandingsTable.StandingsLists?.[0];
  return list?.ConstructorStandings ?? [];
}

export async function getDriverSeasonResults(
  year: number,
  driverId: string
): Promise<Array<{ round: string; raceName: string; date: string; result: JolpicaResult }>> {
  const url = `${BASE}/${year}/drivers/${driverId}/results.json`;
  const data = await fetchJson<JolpicaRaceResultsResponse>(url);
  const races = data.MRData.RaceTable.Races ?? [];
  return races
    .filter((r) => (r as any).Results?.[0])
    .map((r) => ({
      round: r.round,
      raceName: r.raceName,
      date: r.date,
      result: (r as any).Results[0] as JolpicaResult,
    }));
}

export async function getConstructorSeasonResults(
  year: number,
  constructorId: string
): Promise<Array<{ round: string; raceName: string; date: string; results: JolpicaResult[] }>> {
  const url = `${BASE}/${year}/constructors/${constructorId}/results.json`;
  const data = await fetchJson<JolpicaRaceResultsResponse>(url);
  const races = data.MRData.RaceTable.Races ?? [];
  return races.map((r) => ({
    round: r.round,
    raceName: r.raceName,
    date: r.date,
    results: (r as any).Results ?? [],
  }));
}

export function raceStartLocal(r: { date: string; time?: string }): Date {
  const iso = r.time ? `${r.date}T${r.time}` : `${r.date}T00:00:00Z`;
  return new Date(iso);
}
