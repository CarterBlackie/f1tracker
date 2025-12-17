import { describe, it, expect, beforeEach } from "vitest";
import { buildTrackOutline, resetTrackOutline } from "../utils/openf1Track";
import type { OpenF1LocationPoint } from "../types/openf1";

function pt(
  driver_number: number,
  i: number,
  isoBase = "2025-01-01T00:00:00.000Z"
): OpenF1LocationPoint {
  const base = new Date(isoBase).getTime();
  const d = new Date(base + i * 1000).toISOString(); // +1s each
  return {
    driver_number,
    date: d,
    x: i,
    y: i * 2,
    z: 0,
  };
}

describe("utils/openf1Track", () => {
  beforeEach(() => {
    resetTrackOutline();
  });

  it("returns empty outline until it has enough points (min 200)", () => {
    const points = Array.from({ length: 150 }, (_, i) => pt(44, i));
    const outline = buildTrackOutline(points);
    expect(outline).toEqual([]); // cachedOutline starts empty
  });

  it("locks to the driver with the most points and ignores others", () => {
    // First call: driver 44 has more points than driver 1, so it should lock to 44
    const firstBatch: OpenF1LocationPoint[] = [
      ...Array.from({ length: 60 }, (_, i) => pt(44, i)),
      ...Array.from({ length: 20 }, (_, i) => pt(1, i)),
    ];

    // Still not enough for outline
    expect(buildTrackOutline(firstBatch)).toEqual([]);

    // Second call: try to “distract” with lots of driver 1 points
    const distractorBatch: OpenF1LocationPoint[] = [
      ...Array.from({ length: 250 }, (_, i) => pt(1, 1000 + i)),
    ];

    // If it stayed locked to 44, this still won't build an outline
    // because it shouldn't add driver 1 points to cachedPoints.
    const outlineAfterDistractor = buildTrackOutline(distractorBatch);
    expect(outlineAfterDistractor).toEqual([]);
  });

  it("builds an outline once it accumulates 200+ points for the locked driver", () => {
    // Batch 1: lock to 44
    const batch1: OpenF1LocationPoint[] = [
      ...Array.from({ length: 80 }, (_, i) => pt(44, i)),
      ...Array.from({ length: 30 }, (_, i) => pt(1, i)),
    ];
    expect(buildTrackOutline(batch1)).toEqual([]);

    // Batch 2: add more 44 points (total 210 for 44 across calls)
    const batch2: OpenF1LocationPoint[] = Array.from({ length: 130 }, (_, i) =>
      pt(44, 80 + i)
    );

    const outline = buildTrackOutline(batch2);

    // With 210 points, stride is 1 (210 / 1200 < 1 => stride = 1),
    // so outline length should match cachedPoints length for driver 44.
    expect(outline.length).toBe(210);

    // spot check a couple points
    expect(outline[0]).toEqual({ x: 0, y: 0 });
    expect(outline[10]).toEqual({ x: 10, y: 20 });
    expect(outline[209]).toEqual({ x: 209, y: 418 });
  });

  it("only appends points with increasing dates", () => {
    // lock to 44
    const batch1 = Array.from({ length: 210 }, (_, i) => pt(44, i));
    const outline1 = buildTrackOutline(batch1);
    expect(outline1.length).toBe(210);

    // same points again (same dates) should not append duplicates
    const outline2 = buildTrackOutline(batch1);
    expect(outline2.length).toBe(210);
  });

  it("resetTrackOutline clears cached state", () => {
    const batch = Array.from({ length: 210 }, (_, i) => pt(44, i));
    const outline1 = buildTrackOutline(batch);
    expect(outline1.length).toBe(210);

    resetTrackOutline();

    const outline2 = buildTrackOutline(batch.slice(0, 150));
    expect(outline2).toEqual([]); // back to not enough points
  });
});
