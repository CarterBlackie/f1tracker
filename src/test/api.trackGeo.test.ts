import { describe, it, expect, beforeEach, vi } from "vitest";

function mockGeoJson(features: any[]) {
  return { type: "FeatureCollection", features };
}

async function loadFreshModule() {
  // resets the module-level "cached" variable in trackGeo.ts
  vi.resetModules();
  return await import("../api/trackGeo");
}

describe("api/trackGeo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getAllCircuitGeo caches after first fetch", async () => {
    const { getAllCircuitGeo } = await loadFreshModule();

    const payload = mockGeoJson([
      {
        type: "Feature",
        properties: { name: "Monza" },
        geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      },
    ]);

    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }));

    const a = await getAllCircuitGeo();
    const b = await getAllCircuitGeo();

    expect(a.features.length).toBe(1);
    expect(b.features.length).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("getCircuitLineString finds a LineString by hints", async () => {
    const { getCircuitLineString } = await loadFreshModule();

    const payload = mockGeoJson([
      {
        type: "Feature",
        properties: { name: "Autodromo Nazionale Monza" },
        geometry: {
          type: "LineString",
          coordinates: [[9.28, 45.62], [9.29, 45.63]],
        },
      },
    ]);

    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }));

    const coords = await getCircuitLineString("monza");
    expect(coords).not.toBeNull();
    expect(coords?.length).toBe(2);
  });

  it("getCircuitLineString picks longest segment for MultiLineString", async () => {
    const { getCircuitLineStringByHints } = await loadFreshModule();

    const payload = mockGeoJson([
      {
        type: "Feature",
        properties: { name: "Test Track" },
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [[0, 0], [1, 1]],
            [[0, 0], [1, 1], [2, 2], [3, 3]],
          ],
        },
      },
    ]);

    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }));

    const coords = await getCircuitLineStringByHints(["Test Track"]);
    expect(coords).not.toBeNull();
    expect(coords?.length).toBe(4);
  });

  it("getCircuitLineString returns null if no match", async () => {
    const { getCircuitLineStringByHints } = await loadFreshModule();

    const payload = mockGeoJson([
      {
        type: "Feature",
        properties: { name: "Something Else" },
        geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      },
    ]);

    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }));

    const coords = await getCircuitLineStringByHints(["Nope City"]);
    expect(coords).toBeNull();
  });

  it("lineToSvgPath returns a valid path string with M and L", async () => {
    const { lineToSvgPath } = await loadFreshModule();

    const d = lineToSvgPath(
      [
        [0, 0],
        [10, 0],
        [10, 5],
      ],
      160,
      120,
      8
    );

    expect(d.startsWith("M ")).toBe(true);
    expect(d.includes(" L ")).toBe(true);
  });

  it("throws if geojson fetch fails", async () => {
    const { getAllCircuitGeo } = await loadFreshModule();

    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));

    await expect(getAllCircuitGeo()).rejects.toThrow("Failed to load circuit geojson (404)");
  });
});
