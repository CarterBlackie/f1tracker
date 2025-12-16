import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getDriverStandings, getConstructorStandings } from "../api/f1";
import type { JolpicaDriverStanding, JolpicaConstructorStanding } from "../types/f1";
import "../App.css";

type Tab = "drivers" | "constructors";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      driver: JolpicaDriverStanding[];
      constructor: JolpicaConstructorStanding[];
    };

function driverLabel(s: JolpicaDriverStanding) {
  const d = s.Driver;
  return d.code ? `${d.code} — ${d.familyName}` : `${d.givenName} ${d.familyName}`;
}

function posBadgeClass(pos: number) {
  if (pos === 1) return "badge badgeP1";
  if (pos === 2) return "badge badgeP2";
  if (pos === 3) return "badge badgeP3";
  return "badge";
}

export default function Standings() {
  const navigate = useNavigate();
  const thisYear = new Date().getFullYear();
  const { year } = useParams();

  const y = useMemo(() => {
    const n = Number(year ?? thisYear);
    return Number.isFinite(n) ? n : thisYear;
  }, [year, thisYear]);

  const [tab, setTab] = useState<Tab>("drivers");
  const [state, setState] = useState<State>({ status: "loading" });

  // Keep tab stable when year changes
  useEffect(() => {
    // no-op, but this gives a nice place if you ever want to persist tab in URL
  }, [y]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setState({ status: "loading" });

        const [d, c] = await Promise.all([
          getDriverStandings(y),
          getConstructorStandings(y),
        ]);

        if (!cancelled) {
          setState({ status: "ready", driver: d, constructor: c });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load standings",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [y]);

  const leaderDriverId = useMemo(() => {
    if (state.status !== "ready") return null;
    return state.driver[0]?.Driver?.driverId ?? null;
  }, [state]);

  const leaderConstructorId = useMemo(() => {
    if (state.status !== "ready") return null;
    return state.constructor[0]?.Constructor?.constructorId ?? null;
  }, [state]);

  function goYear(next: number) {
    navigate(`/standings/${next}`);
  }

  return (
    <div className="container">
      <div className="headerRow">
        <h1 className="hTitle">Standings</h1>
        <div className="pillRow">
          <Link className="pill" to="/season">
            Season
          </Link>
          <Link className="pill" to="/">
            Home
          </Link>
        </div>
      </div>

      <div className="subRow">
        <span>
          Year: <strong>{y}</strong>
        </span>
        <span className="small">•</span>
        <span className="small">Drivers and constructors</span>
      </div>

      <div className="card">
        <div className="pillRow" style={{ justifyContent: "space-between" }}>
          <div className="pillRow">
            <button className="btn" onClick={() => goYear(y - 1)}>
              ← {y - 1}
            </button>
            <button className="btn" onClick={() => goYear(thisYear)}>
              This year
            </button>
            <button className="btn" onClick={() => goYear(y + 1)}>
              {y + 1} →
            </button>
          </div>

          <div className="pillRow">
            <Link className={`pill ${y === thisYear ? "pillActive" : ""}`} to={`/standings/${thisYear}`}>
              {thisYear}
            </Link>
            <Link className={`pill ${y === thisYear + 1 ? "pillActive" : ""}`} to={`/standings/${thisYear + 1}`}>
              {thisYear + 1}
            </Link>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${tab === "drivers" ? "tabActive" : ""}`}
            onClick={() => setTab("drivers")}
          >
            Drivers
          </button>
          <button
            className={`tab ${tab === "constructors" ? "tabActive" : ""}`}
            onClick={() => setTab("constructors")}
          >
            Constructors
          </button>
        </div>

        {state.status === "loading" && <p className="small">Loading…</p>}

        {state.status === "error" && (
          <p style={{ color: "crimson", margin: 0 }}>Error: {state.message}</p>
        )}

        {state.status === "ready" && tab === "drivers" && (
          <>
            {state.driver.length === 0 ? (
              <p className="small" style={{ margin: 0 }}>No driver standings found.</p>
            ) : (
              <div className="tableWrap" aria-label="Driver standings table">
                <table className="table">
                  <thead className="thead">
                    <tr>
                      <th className="th pos">Pos</th>
                      <th className="th">Driver</th>
                      <th className="th">Team</th>
                      <th className="th points">Pts</th>
                      <th className="th wins">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.driver.map((s) => {
                      const posNum = Number(s.position);
                      const isLeader = s.Driver.driverId === leaderDriverId;

                      return (
                        <tr className="row" key={s.Driver.driverId}>
                          <td className="td pos">
                            <span className={posBadgeClass(posNum)}>
                              {s.position}
                            </span>
                          </td>

                          <td className="td">
                            <Link to={`/driver/${y}/${s.Driver.driverId}`}>
                              <strong>{driverLabel(s)}</strong>
                            </Link>
                            {isLeader ? (
                              <span style={{ marginLeft: 10 }} className="badge">
                                Leader
                              </span>
                            ) : null}
                          </td>

                          <td className="td">
                            {s.Constructors?.[0] ? (
                              <Link to={`/team/${y}/${s.Constructors[0].constructorId}`}>
                                {s.Constructors[0].name}
                              </Link>
                            ) : (
                              <span className="small">-</span>
                            )}
                          </td>

                          <td className="td points">
                            <strong>{s.points}</strong>
                          </td>

                          <td className="td wins">{s.wins}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {state.status === "ready" && tab === "constructors" && (
          <>
            {state.constructor.length === 0 ? (
              <p className="small" style={{ margin: 0 }}>No constructor standings found.</p>
            ) : (
              <div className="tableWrap" aria-label="Constructor standings table">
                <table className="table" style={{ minWidth: 680 }}>
                  <thead className="thead">
                    <tr>
                      <th className="th pos">Pos</th>
                      <th className="th">Team</th>
                      <th className="th points">Pts</th>
                      <th className="th wins">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.constructor.map((s) => {
                      const posNum = Number(s.position);
                      const isLeader = s.Constructor.constructorId === leaderConstructorId;

                      return (
                        <tr className="row" key={s.Constructor.constructorId}>
                          <td className="td pos">
                            <span className={posBadgeClass(posNum)}>
                              {s.position}
                            </span>
                          </td>

                          <td className="td">
                            <Link to={`/team/${y}/${s.Constructor.constructorId}`}>
                              <strong>{s.Constructor.name}</strong>
                            </Link>
                            {isLeader ? (
                              <span style={{ marginLeft: 10 }} className="badge">
                                Leader
                              </span>
                            ) : null}
                          </td>

                          <td className="td points">
                            <strong>{s.points}</strong>
                          </td>

                          <td className="td wins">{s.wins}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
