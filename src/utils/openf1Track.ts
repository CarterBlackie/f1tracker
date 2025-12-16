import type { OpenF1LocationPoint } from "../types/openf1";

type XY = { x: number; y: number };

// Cache per session (keyed implicitly by call order)
let cachedDriver: number | null = null;
let cachedPoints: OpenF1LocationPoint[] = [];
let cachedOutline: XY[] = [];

/**
 * Build a stable track outline.
 * IMPORTANT:
 * - We ACCUMULATE points across calls
 * - We lock onto ONE driver
 * - We only rebuild when we actually have enough data
 */
export function buildTrackOutline(points: OpenF1LocationPoint[]): XY[] {
  if (!points.length) return cachedOutline;

  // Step 1: lock to a driver once
  if (cachedDriver === null) {
    const counts = new Map<number, number>();
    for (const p of points) {
      counts.set(p.driver_number, (counts.get(p.driver_number) ?? 0) + 1);
    }

    let bestDriver: number | null = null;
    let bestCount = 0;

    for (const [num, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestDriver = num;
      }
    }

    cachedDriver = bestDriver;
  }

  if (cachedDriver === null) return cachedOutline;

  // Step 2: append new points for that driver
  for (const p of points) {
    if (p.driver_number !== cachedDriver) continue;

    const last = cachedPoints[cachedPoints.length - 1];
    if (!last || last.date < p.date) {
      cachedPoints.push(p);
    }
  }

  // Step 3: wait until we have enough data for a lap
  if (cachedPoints.length < 200) {
    return cachedOutline;
  }

  // Step 4: sort once
  cachedPoints.sort((a, b) => a.date.localeCompare(b.date));

  // Step 5: thin to keep SVG light
  const stride = Math.max(1, Math.floor(cachedPoints.length / 1200));

  cachedOutline = cachedPoints
    .filter((_, i) => i % stride === 0)
    .map((p) => ({ x: p.x, y: p.y }));

  return cachedOutline;
}

/**
 * Call this when session changes
 */
export function resetTrackOutline() {
  cachedDriver = null;
  cachedPoints = [];
  cachedOutline = [];
}
