import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDriverStandings, getDriverSeasonResults } from "../api/f1";
import type { JolpicaDriverStanding } from "../types/f1";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      standing: JolpicaDriverStanding | null;
      results: Array<{
        round: string;
        raceName: string;
        date: string;
        pos: string;
        points: string;
        team: string;
        statusText: string;
      }>;
    };

export default function Driver() {
  const { year, driverId } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!year || !driverId) throw new Error("Missing parameters");
        const y = Number(year);

        const [standings, raceResults] = await Promise.all([
          getDriverStandings(y),
          getDriverSeasonResults(y, driverId),
        ]);

        const standing = standings.find((s) => s.Driver.driverId === driverId) ?? null;

        const results = raceResults.map((x) => ({
          round: x.round,
          raceName: x.raceName,
          date: x.date,
          pos: x.result.position,
          points: x.result.points,
          team: x.result.Constructor.name,
          statusText: x.result.Time?.time ?? x.result.status,
        }));

        if (!cancelled) {
          setState({ status: "ready", standing, results });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load driver",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, driverId]);

  if (state.status === "loading") return <div style={{ padding: "2rem" }}>Loading…</div>;

  if (state.status === "error") {
    return (
      <div style={{ padding: "2rem" }}>
        <p>Error: {state.message}</p>
        <Link to="/season">Back to season</Link>
      </div>
    );
  }

  const y = year!;
  const d = state.standing?.Driver;
  const name = d ? `${d.givenName} ${d.familyName}` : driverId;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <Link to="/season">← Back to season</Link>

      <h1 style={{ marginBottom: 6 }}>
        {name} <span style={{ opacity: 0.7 }}>({y})</span>
      </h1>

      {state.standing ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: "1rem",
            margin: "1rem 0",
          }}
        >
          <div>
            <strong>Championship position:</strong> {state.standing.position}
          </div>
          <div>
            <strong>Points:</strong> {state.standing.points}
          </div>
          <div>
            <strong>Wins:</strong> {state.standing.wins}
          </div>
          <div>
            <strong>Team:</strong> {state.standing.Constructors?.[0]?.name ?? "-"}
          </div>
        </div>
      ) : (
        <p>No standings found for this driver/year.</p>
      )}

      <h2>Race results</h2>

      {state.results.length === 0 ? (
        <p>No race results found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
            <thead>
              <tr>
                {["Rnd", "Race", "Pos", "Pts", "Team", "Time / Status"].map((h) => (
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
              {state.results.map((r) => (
                <tr key={`${r.round}-${r.raceName}`}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.round}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.raceName}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.pos}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.points}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.team}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.statusText}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
