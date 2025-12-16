import { useEffect, useMemo, useState } from "react";
import { getSeasonRaces, raceStartLocal } from "../api/f1";
import type { JolpicaRace } from "../types/f1";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; racesByYear: Record<number, JolpicaRace[]> };

function formatLocal(dt: Date) {
  // local browser time
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export default function Season() {
  const thisYear = new Date().getFullYear();
  const nextYear = thisYear + 1;

  const [activeYear, setActiveYear] = useState<number>(thisYear);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const [r1, r2] = await Promise.all([
          getSeasonRaces(thisYear),
          getSeasonRaces(nextYear),
        ]);

        if (cancelled) return;

        setState({
          status: "ready",
          racesByYear: {
            [thisYear]: r1,
            [nextYear]: r2,
          },
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Failed to load season data",
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [thisYear, nextYear]);

  const races = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.racesByYear[activeYear] ?? [];
  }, [state, activeYear]);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Season</h1>

      <div style={{ display: "flex", gap: "0.75rem", margin: "1rem 0" }}>
        <button
          onClick={() => setActiveYear(thisYear)}
          disabled={activeYear === thisYear}
        >
          {thisYear}
        </button>
        <button
          onClick={() => setActiveYear(nextYear)}
          disabled={activeYear === nextYear}
        >
          {nextYear}
        </button>
      </div>

      {state.status === "loading" && <p>Loading calendar…</p>}

      {state.status === "error" && (
        <p style={{ color: "crimson" }}>Error: {state.message}</p>
      )}

      {state.status === "ready" && races.length === 0 && (
        <p>No races found for {activeYear}.</p>
      )}

      {state.status === "ready" && races.length > 0 && (
        <ol style={{ paddingLeft: "1.25rem" }}>
          {races.map((r) => {
            const dt = raceStartLocal(r);
            return (
              <li key={`${r.season}-${r.round}`} style={{ marginBottom: "0.8rem" }}>
                <div style={{ fontWeight: 700 }}>{r.raceName}</div>
                <div style={{ opacity: 0.85 }}>
                  {r.Circuit.circuitName} — {r.Circuit.Location.locality},{" "}
                  {r.Circuit.Location.country}
                </div>
                <div style={{ opacity: 0.85 }}>{formatLocal(dt)}</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
