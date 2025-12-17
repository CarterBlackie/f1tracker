import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSeasonRaces,
  getRace,
  getRaceResults,
  getDriverStandings,
  getConstructorStandings,
  getDriverSeasonResults,
  getConstructorSeasonResults,
  raceStartLocal,
} from "../api/f1";

function mockFetchOnce(data: any, ok = true, status = 200) {
  (globalThis.fetch as any) = vi.fn(async () => ({
    ok,
    status,
    json: async () => data,
  }));
}

describe("api/f1", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("raceStartLocal uses race time when present", () => {
    const d = raceStartLocal({ date: "2025-03-01", time: "15:00:00Z" });
    expect(d.toISOString()).toBe("2025-03-01T15:00:00.000Z");
  });

  it("raceStartLocal uses midnight UTC when time missing", () => {
    const d = raceStartLocal({ date: "2025-03-01" });
    expect(d.toISOString()).toBe("2025-03-01T00:00:00.000Z");
  });

  it("getSeasonRaces returns races array or empty", async () => {
    mockFetchOnce({
      MRData: { RaceTable: { Races: [{ raceName: "Test GP", round: "1" }] } },
    });

    const races = await getSeasonRaces(2025);
    expect(races.length).toBe(1);
    expect(races[0].raceName).toBe("Test GP");
  });

  it("getRace returns first race or null", async () => {
    mockFetchOnce({
      MRData: { RaceTable: { Races: [{ raceName: "Round 2", round: "2" }] } },
    });

    const race = await getRace(2025, 2);
    expect(race?.raceName).toBe("Round 2");

    mockFetchOnce({ MRData: { RaceTable: { Races: [] } } });
    const none = await getRace(2025, 999);
    expect(none).toBeNull();
  });

  it("getRaceResults returns raceName + results or null", async () => {
    mockFetchOnce({
      MRData: {
        RaceTable: {
          Races: [
            {
              raceName: "Results GP",
              Results: [{ position: "1", points: "25" }],
            },
          ],
        },
      },
    });

    const out = await getRaceResults(2025, 1);
    expect(out?.raceName).toBe("Results GP");
    expect(out?.results?.[0]?.position).toBe("1");

    mockFetchOnce({ MRData: { RaceTable: { Races: [] } } });
    const none = await getRaceResults(2025, 1);
    expect(none).toBeNull();
  });

  it("getDriverStandings returns standings list or empty", async () => {
    mockFetchOnce({
      MRData: {
        StandingsTable: {
          StandingsLists: [{ DriverStandings: [{ position: "1" }] }],
        },
      },
    });

    const s = await getDriverStandings(2025);
    expect(s.length).toBe(1);
    expect(s[0].position).toBe("1");

    mockFetchOnce({
      MRData: { StandingsTable: { StandingsLists: [] } },
    });
    const empty = await getDriverStandings(2025);
    expect(empty).toEqual([]);
  });

  it("getConstructorStandings returns standings list or empty", async () => {
    mockFetchOnce({
      MRData: {
        StandingsTable: {
          StandingsLists: [{ ConstructorStandings: [{ position: "1" }] }],
        },
      },
    });

    const s = await getConstructorStandings(2025);
    expect(s.length).toBe(1);
    expect(s[0].position).toBe("1");

    mockFetchOnce({
      MRData: { StandingsTable: { StandingsLists: [] } },
    });
    const empty = await getConstructorStandings(2025);
    expect(empty).toEqual([]);
  });

  it("getDriverSeasonResults maps each race to a single result", async () => {
    mockFetchOnce({
      MRData: {
        RaceTable: {
          Races: [
            { round: "1", raceName: "A", date: "2025-03-01", Results: [{ position: "3" }] },
            { round: "2", raceName: "B", date: "2025-03-08", Results: [] }, // filtered out
          ],
        },
      },
    });

    const rows = await getDriverSeasonResults(2025, "max_verstappen");
    expect(rows.length).toBe(1);
    expect(rows[0].raceName).toBe("A");
    expect(rows[0].result.position).toBe("3");
  });

  it("getConstructorSeasonResults maps races to results array (even empty)", async () => {
    mockFetchOnce({
      MRData: {
        RaceTable: {
          Races: [
            { round: "1", raceName: "A", date: "2025-03-01", Results: [{ position: "1" }] },
            { round: "2", raceName: "B", date: "2025-03-08", Results: [] },
          ],
        },
      },
    });

    const rows = await getConstructorSeasonResults(2025, "red_bull");
    expect(rows.length).toBe(2);
    expect(rows[0].results.length).toBe(1);
    expect(rows[1].results.length).toBe(0);
  });

  it("throws on non-ok fetch", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));

    await expect(getSeasonRaces(2025)).rejects.toThrow("HTTP 500");
  });
});
