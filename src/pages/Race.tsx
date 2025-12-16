import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRace, getRaceResults, raceStartLocal } from "../api/f1";
import type { JolpicaRace, JolpicaResult, JolpicaSession } from "../types/f1";
import CircuitHeader from "../components/CircuitHeader";
import TrackMap from "../components/TrackMap";
import RaceSummary from "../components/RaceSummary";
import "../App.css";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; race: JolpicaRace; results: JolpicaResult[] | null };

type Tab = "results" | "sessions";

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

function sessionToLocal(s: JolpicaSession): Date {
  const iso = s.time ? `${s.date}T${s.time}` : `${s.date}T00:00:00Z`;
  return new Date(iso);
}

function driverName(r: JolpicaResult) {
  const d = r.Driver;
  return d.code ? `${d.code} — ${d.familyName}` : `${d.givenName} ${d.familyName}`;
}

function finishOrStatus(r: JolpicaResult) {
  return (r as any).Time?.time ?? (r as any).status ?? "-";
}

export default function Race() {
  const { year, round } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [tab, setTab] = useState<Tab>("results");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!year || !round) throw new Error("Missing parameters");

        const y = Number(year);
        const r = Number(round);

        if (!Number.isFinite(y) || !Number.isFinite(r)) {
          throw new Error("Year/round must be numbers");
        }

        const race = await getRace(y, r);
        if (!race) throw new Error("Race not found");

        const res = await getRaceResults(y, r);
        const results = res?.results?.length ? res.results : null;

        if (!cancelled) {
          setState({ status: "ready", race, results });
          setTab(results ? "results" : "sessions");
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load race",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, round]);

  const sessions = useMemo(() => {
    if (state.status !== "ready") return [];
    const r = state.race;

    const list: Array<{ label: string; s: JolpicaSession }> = [];
    if (r.FirstPractice) list.push({ label: "FP1", s: r.FirstPractice });
    if (r.SecondPractice) list.push({ label: "FP2", s: r.SecondPractice });
    if (r.ThirdPractice) list.push({ label: "FP3", s: r.ThirdPractice });
    if (r.SprintQualifying) list.push({ label: "Sprint Qualifying", s: r.SprintQualifying });
    if (r.Sprint) list.push({ label: "Sprint", s: r.Sprint });
    if (r.Qualifying) list.push({ label: "Qualifying", s: r.Qualifying });

    list.push({ label: "Race", s: { date: r.date, time: r.time } });

    return list.sort(
      (a, b) => sessionToLocal(a.s).getTime() - sessionToLocal(b.s).getTime()
    );
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className="container">
        <div className="card">
          <p className="small" style={{ margin: 0 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="container">
        <div className="card">
          <p style={{ color: "crimson", margin: 0 }}>Error: {state.message}</p>
          <div style={{ marginTop: 12 }}>
            <Link className="pill" to="/season">← Back to season</Link>
          </div>
        </div>
      </div>
    );
  }

  const { race, results } = state;
  const dt = raceStartLocal(race);

  return (
    <div className="container">
      <div className="headerRow">
        <div>
          <Link className="pill" to="/season">← Back</Link>
          <h1 className="hTitle" style={{ marginTop: 10 }}>{race.raceName}</h1>
          <div className="small">
            {race.Circuit.Location.locality}, {race.Circuit.Location.country} • {formatLocal(dt)}
          </div>
        </div>

        <div className="pillRow">
          <Link className="pill" to={`/standings/${race.season}`}>Standings</Link>
          <Link className="pill" to="/">Home</Link>
        </div>
      </div>

      <div className="card">
        <div className="subRow">
          <span className="badge">Year {race.season}</span>
          <span className="badge">Round {race.round}</span>
          <span className="badge">{race.Circuit.circuitName}</span>
        </div>

        <CircuitHeader race={race} />

        {/* Track map (auto mode only) */}
        <div className="trackCard" style={{ marginTop: 14 }}>
          <TrackMap circuitId={race.Circuit.circuitId} />
        </div>

        <div className="tabs" style={{ marginTop: 16 }}>
          <button
            className={`tab ${tab === "results" ? "tabActive" : ""}`}
            onClick={() => setTab("results")}
            disabled={!results}
          >
            Results
          </button>
          <button
            className={`tab ${tab === "sessions" ? "tabActive" : ""}`}
            onClick={() => setTab("sessions")}
          >
            Weekend sessions
          </button>
        </div>

        {tab === "results" && results && (
          <>
            <RaceSummary results={results} />

            <div className="tableWrap" style={{ marginTop: 12 }}>
              <table className="table" style={{ minWidth: 860 }}>
                <thead className="thead">
                  <tr>
                    {["Pos", "Driver", "Team", "Grid", "Laps", "Time / Status", "Pts"].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr className="row" key={`${r.position}-${r.Driver.driverId}`}>
                      <td className="td pos"><span className="badge">{r.position}</span></td>
                      <td className="td">
                        <Link to={`/driver/${race.season}/${r.Driver.driverId}`}>
                          <strong>{driverName(r)}</strong>
                        </Link>
                      </td>
                      <td className="td">
                        <Link to={`/team/${race.season}/${r.Constructor.constructorId}`}>
                          {r.Constructor.name}
                        </Link>
                      </td>
                      <td className="td">{(r as any).grid ?? "-"}</td>
                      <td className="td">{(r as any).laps ?? "-"}</td>
                      <td className="td">{finishOrStatus(r)}</td>
                      <td className="td points"><strong>{(r as any).points ?? "-"}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "sessions" && (
          <div className="tableWrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead className="thead">
                <tr>
                  <th className="th">Session</th>
                  <th className="th">Local time</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((x) => (
                  <tr className="row" key={x.label}>
                    <td className="td"><strong>{x.label}</strong></td>
                    <td className="td">{formatLocal(sessionToLocal(x.s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
