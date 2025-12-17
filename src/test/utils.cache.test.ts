import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { loadCache, saveCache } from "../utils/cache";

describe("utils/cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("saveCache + loadCache returns saved data", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const value = { a: 1, b: "x" };
    saveCache("hello", value);

    const got = loadCache<typeof value>("hello");
    expect(got).toEqual(value);
  });

  it("loadCache returns null if missing", () => {
    const got = loadCache<any>("does-not-exist");
    expect(got).toBeNull();
  });

  it("loadCache returns null and removes item if expired", () => {
    // TTL is 10 minutes in the file
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    saveCache("k", { ok: true });

    // jump past TTL (10 min + 1ms)
    vi.setSystemTime(new Date("2025-01-01T00:10:00.001Z"));

    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

    const got = loadCache<any>("k");
    expect(got).toBeNull();
    expect(removeSpy).toHaveBeenCalled(); // it should clean up expired entries
  });

  it("loadCache returns null if JSON is invalid", () => {
    localStorage.setItem("f1tracker:bad", "{not-json");
    const got = loadCache<any>("bad");
    expect(got).toBeNull();
  });

  it("saveCache swallows quota errors", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

    expect(() => saveCache("k", { a: 1 })).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
