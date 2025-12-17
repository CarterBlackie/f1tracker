import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Race from "../pages/Race";

vi.mock("../api/f1", () => {
  return {
    getRace: vi.fn(),
    getRaceResults: vi.fn(),
    raceStartLocal: (r: any) => new Date(`${r.date}T${r.time ?? "00:00:00Z"}`),
  };
});

// Mock child components to keep this test focused on page logic
vi.mock("../components/CircuitHeader", () => ({
  default: () => <div data-testid="circuit-header" />,
}));
vi.mock("../components/TrackMap", () => ({
  default: () => <div data-testid="track-map" />,
}));
vi.mock("../components/RaceSummary", () => ({
  default: () => <div data-testid="race-summary" />,
}));

const { getRace, getRaceResults } = await import("../api/f1");

function wrap(route = "/race/2025/1") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/race/:year/:round" element={<Race />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Race page", () => {
  it("renders results tab when results exist", async () => {
    (getRace as any).mockResolvedValue({
      season: "2025",
      round: "1",
      raceName: "Test GP",
      date: "2025-03-01",
      time: "12:00:00Z",
      Circuit: {
        circuitId: "monza",
        circuitName: "Autodromo Nazionale Monza",
        Location: { locality: "Monza", country: "Italy" },
      },
    });

    (getRaceResults as any).mockResolvedValue({
      results: [
        {
          position: "1",
          points: "25",
          Driver: { driverId: "max", code: "VER", familyName: "Verstappen", givenName: "Max" },
          Constructor: { constructorId: "redbull", name: "Red Bull" },
          grid: "1",
          laps: "57",
          status: "Finished",
        },
      ],
    });

    wrap();

    expect(await screen.findByText("Test GP")).toBeInTheDocument();
    expect(screen.getByTestId("circuit-header")).toBeInTheDocument();
    expect(screen.getByTestId("track-map")).toBeInTheDocument();
    expect(screen.getByTestId("race-summary")).toBeInTheDocument();

    // driver link text should exist
    expect(screen.getByText(/VER — Verstappen/)).toBeInTheDocument();
  });
});
