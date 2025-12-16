import type { OpenF1LocationPoint } from "../types/openf1";

export function buildTrackOutline(points: OpenF1LocationPoint[]) {
  // Pick a single driver (the one with the most points)
  const byDriver = new Map<number, OpenF1LocationPoint[]>();

  for (const p of points) {
    if (!byDriver.has(p.driver_number)) {
      byDriver.set(p.driver_number, []);
    }
    byDriver.get(p.driver_number)!.push(p);
  }

  let best: OpenF1LocationPoint[] = [];
  for (const list of byDriver.values()) {
    if (list.length > best.length) best = list;
  }

  // Sort by time
  best.sort((a, b) => a.date.localeCompare(b.date));

  // Thin points (every Nth) to keep SVG light
  const stride = Math.max(1, Math.floor(best.length / 900));

  return best
    .filter((_, i) => i % stride === 0)
    .map((p) => ({ x: p.x, y: p.y }));
}
