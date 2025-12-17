import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sessionTimeAt,
  getLocationSlice,
  getPositionSlice,
  getLapsSlice,
} from "../api/openf1";

vi.mock("../utils/cache", () => {
  return {
    loadCache: vi.fn(() => null),
    saveCache: vi.fn(() => undefined),
  };
});

function mockFetchOnce(data: any, ok = true, status = 200) {
  (globalThis.fetch as any) = vi.fn(async () => ({
    ok,
    status,
    json: async () => data,
  }));
}

describe("api/openf1", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sessionTimeAt clamps t01 to [0..1]", () => {
    const session = {
      date_start: "2025-01-01T00:00:00.000Z",
      date_end: "2025-01-01T01:00:00.000Z",
    } as any;

    expect(sessionTimeAt(session, -1).toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(sessionTimeAt(session, 2).toISOString()).toBe("2025-01-01T01:00:00.000Z");
  });

  it("sessionTimeAt returns midpoint at 0.5", () => {
    const session = {
      date_start: "2025-01-01T00:00:00.000Z",
      date_end: "2025-01-01T02:00:00.000Z",
    } as any;

    expect(sessionTimeAt(session, 0.5).toISOString()).toBe("2025-01-01T01:00:00.000Z");
  });

  it("getLocationSlice calls OpenF1 with date window", async () => {
    mockFetchOnce([]);

    await getLocationSlice(123, "2025-01-01T00:00:01.234Z", 800);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const url = String((globalThis.fetch as any).mock.calls[0][0]);

    expect(url).toContain("/location?session_key=123&date>=");
    expect(url).toContain("&date<=");
    // timestamps are encoded (':' becomes %3A)
    expect(url).toContain("%3A");
  });

  it("getPositionSlice calls OpenF1 with date window", async () => {
    mockFetchOnce([]);

    await getPositionSlice(123, "2025-01-01T00:00:01.234Z", 1200);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const url = String((globalThis.fetch as any).mock.calls[0][0]);

    expect(url).toContain("/position?session_key=123&date>=");
    expect(url).toContain("&date<=");
    expect(url).toContain("%3A");
  });

  it("getLapsSlice uses date_start filters", async () => {
    mockFetchOnce([]);

    await getLapsSlice(123, "2025-01-01T00:00:01.234Z");

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const url = String((globalThis.fetch as any).mock.calls[0][0]);

    expect(url).toContain("/laps?session_key=123&date_start>=");
    expect(url).toContain("&date_start<=");
    expect(url).toContain("%3A");
  });

  it("throws on non-ok fetch", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    }));

    await expect(getPositionSlice(1, "2025-01-01T00:00:00.000Z")).rejects.toThrow(
      "OpenF1 HTTP 429"
    );
  });
});
