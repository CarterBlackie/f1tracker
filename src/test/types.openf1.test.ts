import { describe, it, expectTypeOf } from "vitest";
import type {
  OpenF1Session,
  OpenF1Driver,
  OpenF1LocationPoint,
  OpenF1PositionPoint,
  OpenF1Lap,
} from "../types/openf1";

describe("types/openf1", () => {
  it("OpenF1Session shape", () => {
    const s: OpenF1Session = {
      session_key: 123,
      meeting_key: 456,
      session_name: "Race",
      country_name: "Bahrain",
      location: "Sakhir",
      circuit_short_name: "Bahrain",
      date_start: "2025-03-02T15:00:00Z",
      date_end: "2025-03-02T17:00:00Z",
    };

    expectTypeOf(s).toMatchTypeOf<OpenF1Session>();
    expectTypeOf(s.session_key).toEqualTypeOf<number>();
    expectTypeOf(s.date_end).toEqualTypeOf<string>();
  });

  it("OpenF1Driver shape", () => {
    const d: OpenF1Driver = {
      driver_number: 1,
      name_acronym: "VER",
      full_name: "Max Verstappen",
      team_name: "Red Bull Racing",
      team_colour: "3671C6", // optional
    };

    expectTypeOf(d).toMatchTypeOf<OpenF1Driver>();
    expectTypeOf(d.team_colour).toEqualTypeOf<string | undefined>();
  });

  it("OpenF1LocationPoint shape", () => {
    const p: OpenF1LocationPoint = {
      driver_number: 1,
      date: "2025-03-02T15:00:01.000Z",
      x: 123.45,
      y: 678.9,
      z: 0,
    };

    expectTypeOf(p).toMatchTypeOf<OpenF1LocationPoint>();
    expectTypeOf(p.x).toEqualTypeOf<number>();
  });

  it("OpenF1PositionPoint shape", () => {
    const pos: OpenF1PositionPoint = {
      driver_number: 1,
      date: "2025-03-02T15:00:01.000Z",
      position: 1,
    };

    expectTypeOf(pos).toMatchTypeOf<OpenF1PositionPoint>();
    expectTypeOf(pos.position).toEqualTypeOf<number>();
  });

  it("OpenF1Lap minimal shape", () => {
    const lap: OpenF1Lap = {
      driver_number: 1,
      lap_number: 12,
      date_start: "2025-03-02T15:22:10.000Z",
    };

    expectTypeOf(lap).toMatchTypeOf<OpenF1Lap>();
    expectTypeOf(lap.lap_number).toEqualTypeOf<number>();
  });
});
