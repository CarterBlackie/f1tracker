import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RaceSummary from "../components/RaceSummary";

const results = [
  {
    position: "1",
    status: "Finished",
    laps: "57",
    Driver: { code: "VER", givenName: "Max", familyName: "Verstappen" },
    FastestLap: { rank: "1", Time: { time: "1:32.456" } },
  },
  {
    position: "2",
    status: "Finished",
    laps: "57",
    Driver: { code: "NOR", givenName: "Lando", familyName: "Norris" },
  },
  {
    position: "3",
    status: "Finished",
    laps: "57",
    Driver: { code: "LEC", givenName: "Charles", familyName: "Leclerc" },
  },
  {
    position: "4",
    status: "Accident",
    laps: "32",
    Driver: { givenName: "Someone", familyName: "Crashed" },
  },
] as any[];

describe("RaceSummary", () => {
  it("renders podium drivers", () => {
    render(<RaceSummary results={results} />);
    expect(screen.getByText(/P1 VER — Verstappen/)).toBeInTheDocument();
    expect(screen.getByText(/P2 NOR — Norris/)).toBeInTheDocument();
    expect(screen.getByText(/P3 LEC — Leclerc/)).toBeInTheDocument();
  });

  it("renders fastest lap row", () => {
    render(<RaceSummary results={results} />);
    const label = screen.getByText("Fastest lap:");
    expect(label.parentElement).toHaveTextContent("Fastest lap: VER — Verstappen — 1:32.456");
  });

  it("renders classified + DNF row", () => {
    render(<RaceSummary results={results} />);
    const label = screen.getByText("Classified:");
    expect(label.parentElement).toHaveTextContent("Classified: 3 / 4");
    expect(label.parentElement).toHaveTextContent("DNF: 1");
  });

  it("renders total laps row", () => {
    render(<RaceSummary results={results} />);
    const label = screen.getByText("Total laps:");
    expect(label.parentElement).toHaveTextContent("Total laps: 57");
  });
});
