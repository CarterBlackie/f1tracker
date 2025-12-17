import { describe, it, expectTypeOf } from "vitest";
import type {
  JolpicaSession,
  JolpicaRace,
  JolpicaRacesResponse,
  JolpicaDriver,
  JolpicaConstructor,
  JolpicaFastestLap,
  JolpicaResult,
  JolpicaRaceResultsResponse,
  JolpicaDriverStandingsResponse,
  JolpicaConstructorStandingsResponse,
} from "../types/f1";

describe("types/f1", () => {
  it("JolpicaSession shape", () => {
    const s = { date: "2025-01-01", time: "12:00:00Z" } satisfies JolpicaSession;

    // "time?" means string | undefined, but our value is a string.
    // Use toMatchTypeOf for assignable checks.
    expectTypeOf(s.date).toEqualTypeOf<string>();
    expectTypeOf(s.time).toMatchTypeOf<string | undefined>();
  });

  it("JolpicaRace shape", () => {
    const race = {
      season: "2025",
      round: "1",
      raceName: "Test GP",
      date: "2025-03-01",
      time: "12:00:00Z",
      Circuit: {
        circuitId: "monza",
        circuitName: "Autodromo Nazionale Monza",
        Location: {
          locality: "Monza",
          country: "Italy",
          lat: "45.6156",
          long: "9.2811",
        },
      },
      FirstPractice: { date: "2025-02-28", time: "10:00:00Z" },
      Qualifying: { date: "2025-03-01", time: "10:00:00Z" },
    } satisfies JolpicaRace;

    expectTypeOf(race.Circuit.circuitId).toEqualTypeOf<string>();
    expectTypeOf(race.time).toMatchTypeOf<string | undefined>();
    expectTypeOf(race.Circuit.Location.lat).toMatchTypeOf<string | undefined>();
    expectTypeOf(race.Circuit.Location.long).toMatchTypeOf<string | undefined>();
  });

  it("JolpicaRacesResponse shape", () => {
    const resp = {
      MRData: {
        RaceTable: {
          season: "2025",
          Races: [
            {
              season: "2025",
              round: "1",
              raceName: "Test GP",
              date: "2025-03-01",
              Circuit: {
                circuitId: "monza",
                circuitName: "Monza",
                Location: { locality: "Monza", country: "Italy" },
              },
            },
          ],
        },
      },
    } satisfies JolpicaRacesResponse;

    expectTypeOf(resp.MRData.RaceTable.Races).toMatchTypeOf<JolpicaRace[]>();
  });

  it("Driver + Constructor shapes", () => {
    const d = {
      driverId: "max_verstappen",
      givenName: "Max",
      familyName: "Verstappen",
      code: "VER",
      permanentNumber: "1",
      nationality: "Dutch",
    } satisfies JolpicaDriver;

    const c = {
      constructorId: "red_bull",
      name: "Red Bull",
      nationality: "Austrian",
    } satisfies JolpicaConstructor;

    expectTypeOf(d.code).toMatchTypeOf<string | undefined>();
    expectTypeOf(d.permanentNumber).toMatchTypeOf<string | undefined>();
    expectTypeOf(d.nationality).toMatchTypeOf<string | undefined>();
    expectTypeOf(c.nationality).toMatchTypeOf<string | undefined>();
  });

  it("Result + FastestLap shapes", () => {
    const fl = {
      rank: "1",
      lap: "42",
      Time: { time: "1:32.456" },
      AverageSpeed: { units: "kph", speed: "245.1" },
    } satisfies JolpicaFastestLap;

    const result = {
      position: "1",
      points: "25",
      status: "Finished",
      Driver: {
        driverId: "max_verstappen",
        givenName: "Max",
        familyName: "Verstappen",
        code: "VER",
      },
      Constructor: { constructorId: "red_bull", name: "Red Bull" },
      grid: "1",
      laps: "57",
      Time: { time: "1:28:12.000" },
      FastestLap: fl,
    } satisfies JolpicaResult;

    expectTypeOf(result.FastestLap).toMatchTypeOf<JolpicaFastestLap | undefined>();
    expectTypeOf(result.Time?.time).toMatchTypeOf<string | undefined>();
  });

  it("RaceResults response shape", () => {
    const resp = {
      MRData: {
        RaceTable: {
          season: "2025",
          round: "1",
          Races: [
            {
              season: "2025",
              round: "1",
              raceName: "Test GP",
              date: "2025-03-01",
              Circuit: {
                circuitId: "monza",
                circuitName: "Monza",
                Location: { locality: "Monza", country: "Italy" },
              },
              Results: [
                {
                  position: "1",
                  points: "25",
                  status: "Finished",
                  Driver: {
                    driverId: "max_verstappen",
                    givenName: "Max",
                    familyName: "Verstappen",
                    code: "VER",
                  },
                  Constructor: { constructorId: "red_bull", name: "Red Bull" },
                },
              ],
            },
          ],
        },
      },
    } satisfies JolpicaRaceResultsResponse;

    expectTypeOf(resp.MRData.RaceTable.Races[0].Results).toMatchTypeOf<JolpicaResult[]>();
  });

  it("Standings responses shape", () => {
    const driverStandings = {
      MRData: {
        StandingsTable: {
          season: "2025",
          StandingsLists: [
            {
              season: "2025",
              round: "1",
              DriverStandings: [
                {
                  position: "1",
                  points: "100",
                  wins: "3",
                  Driver: {
                    driverId: "max_verstappen",
                    givenName: "Max",
                    familyName: "Verstappen",
                    code: "VER",
                  },
                  Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
                },
              ],
            },
          ],
        },
      },
    } satisfies JolpicaDriverStandingsResponse;

    const constructorStandings = {
      MRData: {
        StandingsTable: {
          season: "2025",
          StandingsLists: [
            {
              season: "2025",
              round: "1",
              ConstructorStandings: [
                {
                  position: "1",
                  points: "150",
                  wins: "4",
                  Constructor: { constructorId: "red_bull", name: "Red Bull" },
                },
              ],
            },
          ],
        },
      },
    } satisfies JolpicaConstructorStandingsResponse;

    expectTypeOf(driverStandings.MRData.StandingsTable.season).toEqualTypeOf<string>();
    expectTypeOf(constructorStandings.MRData.StandingsTable.season).toEqualTypeOf<string>();
  });
});
