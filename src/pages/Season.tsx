import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSeasonRaces, raceStartLocal } from "../api/f1";
import type { JolpicaRace } from "../types/f1";
import "../App.css";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; racesByYear: Record<number, JolpicaRace[]> };

function formatLocal(dt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

function shortDate(dt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
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

  const now = Date.now();

  const { upcoming, completed } = useMemo(() => {
    const withTime = races.map((r) => {
      const dt = raceStartLocal(r);
      return { r, dt, ms: dt.getTime() };
    });

    const completed = withTime
      .filter((x) => x.ms < now)
      .sort((a, b) => b.ms - a.ms);

    const upcoming = withTime
      .filter((x) => x.ms >= now)
      .sort((a, b) => a.ms - b.ms);

    return { upcoming, completed };
  }, [races, now]);

  return (
    <div className="container">
      <div className="headerRow">
        <h1 className="hTitle">Season</h1>
        <div className="pillRow">
          <Link className="pill" to={`/standings/${activeYear}`}>
            Standings
          </Link>
          <Link className="pill" to="/">
            Home
          </Link>
        </div>
      </div>

      <div className="subRow">
        <span>
          Year: <strong>{activeYear}</strong>
        </span>
        <span className="small">•</span>
        <span className="small">Calendar + race links</span>
      </div>

      <div className="card">
        <div className="pillRow" style={{ justifyContent: "space-between" }}>
          <div className="pillRow">
            <button
              className={`tab ${activeYear === thisYear ? "tabActive" : ""}`}
              onClick={() => setActiveYear(thisYear)}
            >
              {thisYear}
            </button>

            <button
              className={`tab ${activeYear === nextYear ? "tabActive" : ""}`}
              onClick={() => setActiveYear(nextYear)}
            >
              {nextYear}
            </button>
          </div>

          <div className="pillRow">
            <span className="badge">Upcoming: {upcoming.length}</span>
            <span className="badge">Completed: {completed.length}</span>
          </div>
        </div>

        {state.status === "loading" && <p className="small">Loading calendar…</p>}

        {state.status === "error" && (
          <p style={{ color: "crimson", margin: 0 }}>Error: {state.message}</p>
        )}

        {state.status === "ready" && races.length === 0 && (
          <p className="small" style={{ margin: 0 }}>
            No races found for {activeYear}.
          </p>
        )}

        {state.status === "ready" && races.length > 0 && (
          <>
            <div className="divider" />

            <h2 style={{ margin: "0 0 10px" }}>Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="small" style={{ marginTop: 0 }}>
                No upcoming races.
              </p>
            ) : (
              <div className="gridCards">
                {upcoming.map(({ r, dt }) => (
                  <Link
                    key={`${r.season}-${r.round}`}
                    to={`/race/${r.season}/${r.round}`}
                    className="raceCard"
                  >
                    <div className="raceTop">
                      <span className="badge">R{r.round}</span>
                      <span className="badge">{shortDate(dt)}</span>
                      <span className="badge" style={{ marginLeft: "auto" }}>
                        Upcoming
                      </span>
                    </div>

                    <div className="raceTitle">{r.raceName}</div>
                    <div className="raceMeta">
                      {r.Circuit.circuitName} • {r.Circuit.Location.locality},{" "}
                      {r.Circuit.Location.country}
                    </div>
                    <div className="raceMeta">{formatLocal(dt)}</div>
                  </Link>
                ))}
              </div>
            )}

            <div className="divider" />

            <h2 style={{ margin: "0 0 10px" }}>Completed</h2>
            {completed.length === 0 ? (
              <p className="small" style={{ marginTop: 0 }}>
                No completed races.
              </p>
            ) : (
              <div className="gridCards">
                {completed.map(({ r, dt }) => (
                  <Link
                    key={`${r.season}-${r.round}`}
                    to={`/race/${r.season}/${r.round}`}
                    className="raceCard"
                  >
                    <div className="raceTop">
                      <span className="badge">R{r.round}</span>
                      <span className="badge">{shortDate(dt)}</span>
                      <span className="badge" style={{ marginLeft: "auto" }}>
                        Completed
                      </span>
                    </div>

                    <div className="raceTitle">{r.raceName}</div>
                    <div className="raceMeta">
                      {r.Circuit.circuitName} • {r.Circuit.Location.locality},{" "}
                      {r.Circuit.Location.country}
                    </div>
                    <div className="raceMeta">{formatLocal(dt)}</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
