import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Season from "../pages/Season";

vi.mock("../api/f1", () => {
  return {
    getSeasonRaces: vi.fn(),
    raceStartLocal: (r: any) => new Date(`${r.date}T${r.time ?? "00:00:00Z"}`),
  };
});

const { getSeasonRaces } = await import("../api/f1");

function wrap(route = "/season") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Season />
    </MemoryRouter>
  );
}

describe("Season page", () => {
  it("shows upcoming and completed lists", async () => {
    const thisYear = new Date().getFullYear();
    const nextYear = thisYear + 1;

    (getSeasonRaces as any).mockImplementation(async (year: number) => {
      if (year === thisYear) {
        return [
          {
            season: String(thisYear),
            round: "1",
            raceName: "Completed GP",
            date: "2000-01-01", // always past
            time: "12:00:00Z",
            Circuit: {
              circuitId: "done",
              circuitName: "Done Circuit",
              Location: { locality: "A", country: "B" },
            },
          },
          {
            season: String(thisYear),
            round: "2",
            raceName: "Upcoming GP",
            date: "2099-01-01", // always future
            time: "12:00:00Z",
            Circuit: {
              circuitId: "next",
              circuitName: "Next Circuit",
              Location: { locality: "C", country: "D" },
            },
          },
        ];
      }

      if (year === nextYear) return [];
      return [];
    });

    wrap();

    // Use role=heading so we match the section headers, not the badges
    expect(
      await screen.findByRole("heading", { name: "Upcoming" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Completed" })
    ).toBeInTheDocument();

    expect(screen.getByText("Upcoming GP")).toBeInTheDocument();
    expect(screen.getByText("Completed GP")).toBeInTheDocument();
  });

  it("switches year when you click the next year tab", async () => {
    const thisYear = new Date().getFullYear();
    const nextYear = thisYear + 1;

    (getSeasonRaces as any).mockImplementation(async (year: number) => {
      if (year === thisYear) return [];
      if (year === nextYear) {
        return [
          {
            season: String(nextYear),
            round: "1",
            raceName: "Next Year Opener",
            date: "2099-03-01",
            time: "12:00:00Z",
            Circuit: {
              circuitId: "ny",
              circuitName: "Next Year Circuit",
              Location: { locality: "X", country: "Y" },
            },
          },
        ];
      }
      return [];
    });

    wrap();

    const btn = await screen.findByRole("button", { name: String(nextYear) });
    fireEvent.click(btn);

    expect(await screen.findByText("Next Year Opener")).toBeInTheDocument();
  });
});
