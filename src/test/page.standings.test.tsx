import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Standings from "../pages/Standings";

vi.mock("../api/f1", () => {
  return {
    getDriverStandings: vi.fn(),
    getConstructorStandings: vi.fn(),
  };
});

const { getDriverStandings, getConstructorStandings } = await import("../api/f1");

function wrap(route = "/standings/2025") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/standings/:year" element={<Standings />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Standings page", () => {
  beforeEach(() => {
    vi.setSystemTime?.(new Date("2025-06-01T12:00:00Z") as any);
  });

  it("renders driver standings by default, then switches to constructors", async () => {
    (getDriverStandings as any).mockResolvedValue([
      {
        position: "1",
        points: "100",
        wins: "3",
        Driver: { driverId: "max", code: "VER", familyName: "Verstappen", givenName: "Max" },
        Constructors: [{ constructorId: "redbull", name: "Red Bull" }],
      },
    ]);

    (getConstructorStandings as any).mockResolvedValue([
      {
        position: "1",
        points: "150",
        wins: "4",
        Constructor: { constructorId: "redbull", name: "Red Bull" },
      },
    ]);

    wrap();

    expect(await screen.findByText(/VER — Verstappen/)).toBeInTheDocument();
    expect(screen.getByText("Leader")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Constructors" }));
    expect(await screen.findByText("Red Bull")).toBeInTheDocument();
  });
});
