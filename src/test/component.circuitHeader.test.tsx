import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CircuitHeader from "../components/CircuitHeader";

const mockRace = {
  Circuit: {
    circuitId: "monza",
    circuitName: "Autodromo Nazionale Monza",
    Location: {
      locality: "Monza",
      country: "Italy",
    },
  },
} as any;

describe("CircuitHeader", () => {
  it("renders circuit name and id", () => {
    render(<CircuitHeader race={mockRace} />);

    expect(
      screen.getByText("Autodromo Nazionale Monza")
    ).toBeInTheDocument();

    expect(screen.getByText("monza")).toBeInTheDocument();
  });

  it("renders location text", () => {
    render(<CircuitHeader race={mockRace} />);

    expect(screen.getByText("Monza, Italy")).toBeInTheDocument();
  });
});
