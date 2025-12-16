import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDriverStandings, getConstructorStandings } from "../api/f1";
import type { JolpicaDriverStanding, JolpicaConstructorStanding } from "../types/f1";

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

export default function Standings() {
  const thisYear = new Date().getFullYear();
  const { year } = useParams();
  const y = useMemo(() => Number(year ?? thisYear), [year, thisYear]);

  const [state, setState] = useState<State>({ status: "loading" });

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

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Standings</h1>
        <Link to="/season">Season</Link>
      </div>

      <div style={{ opacity: 0.8, marginTop: 6, marginBottom: 16 }}>
        Year: <strong>{y}</strong>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: 18 }}>
        <Link to={`/standings/${thisYear}`}>{thisYear}</Link>
        <span style={{ opacity: 0.5 }}>•</span>
        <Link to={`/standings/${thisYear + 1}`}>{thisYear + 1}</Link>
      </div>

      {state.status === "loading" && <p>Loading…</p>}

      {state.status === "error" && (
        <p style={{ color: "crimson" }}>Error: {state.message}</p>
      )}

      {state.status === "ready" && (
        <>
          <h2>Driver standings</h2>

          {state.driver.length === 0 ? (
            <p>No driver standings found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
                <thead>
                  <tr>
                    {["Pos", "Driver", "Team", "Pts", "Wins"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #ddd",
                          padding: "8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.driver.map((s) => (
                    <tr key={s.Driver.driverId}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.position}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        <Link to={`/driver/${y}/${s.Driver.driverId}`}>
                          {driverLabel(s)}
                        </Link>
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.Constructors?.[0] ? (
                          <Link to={`/team/${y}/${s.Constructors[0].constructorId}`}>
                            {s.Constructors[0].name}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.points}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.wins}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ marginTop: 28 }}>Constructor standings</h2>

          {state.constructor.length === 0 ? (
            <p>No constructor standings found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 680 }}>
                <thead>
                  <tr>
                    {["Pos", "Team", "Pts", "Wins"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #ddd",
                          padding: "8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.constructor.map((s) => (
                    <tr key={s.Constructor.constructorId}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.position}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        <Link to={`/team/${y}/${s.Constructor.constructorId}`}>
                          {s.Constructor.name}
                        </Link>
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.points}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {s.wins}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
