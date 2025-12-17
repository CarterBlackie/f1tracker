import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../pages/Home";

vi.mock("../api/f1", () => {
  return {
    getSeasonRaces: vi.fn(),
    raceStartLocal: (r: any) => new Date(`${r.date}T${r.time ?? "00:00:00Z"}`),
  };
});

// keep Home test focused: don’t pull in geojson/svg
vi.mock("../components/TrackMap", () => {
  return {
    default: (props: any) => (
      <div data-testid="track-map">TrackMap:{String(props.circuitId)}</div>
    ),
  };
});

const { getSeasonRaces } = await import("../api/f1");

function wrap() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Home />
    </MemoryRouter>
  );
}

describe("Home page", () => {
  it("shows next upcoming race and renders TrackMap", async () => {
    (getSeasonRaces as any).mockImplementation(async (year: number) => {
      // Always give a race in the *future* so it’s “upcoming” no matter when the test runs.
      return [
        {
          season: String(year),
          round: "1",
          raceName: `Future GP ${year}`,
          date: "2099-03-01",
          time: "12:00:00Z",
          Circuit: {
            circuitId: `circuit-${year}`,
            circuitName: `Future Circuit ${year}`,
            Location: { locality: "Monza", country: "Italy" },
          },
        },
      ];
    });

    wrap();

    // Wait for load to finish and UI to render
    expect(await screen.findByText(/Future GP/)).toBeInTheDocument();
    expect(screen.getByText(/Future Circuit/)).toBeInTheDocument();
    expect(screen.getByText(/Monza,\s*Italy/)).toBeInTheDocument();

    expect(screen.getByTestId("track-map")).toBeInTheDocument();
  });
});
