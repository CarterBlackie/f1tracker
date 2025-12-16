import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getConstructorStandings,
  getConstructorSeasonResults,
} from "../api/f1";
import type { JolpicaConstructorStanding, JolpicaResult } from "../types/f1";

type Row = {
  round: string;
  raceName: string;
  date: string;
  drivers: string;
  bestPos: string;
  points: string;
  statuses: string;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; standing: JolpicaConstructorStanding | null; rows: Row[]; teamName: string };

function driverLabel(r: JolpicaResult) {
  const d = r.Driver;
  return d.code ? d.code : `${d.familyName}`;
}

export default function Team() {
  const { year, constructorId } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!year || !constructorId) throw new Error("Missing parameters");
        const y = Number(year);

        const [standings, seasonRaces] = await Promise.all([
          getConstructorStandings(y),
          getConstructorSeasonResults(y, constructorId),
        ]);

        const standing = standings.find(
          (s) => s.Constructor.constructorId === constructorId
        ) ?? null;

        const teamName =
          standing?.Constructor.name ??
          seasonRaces.find((x) => x.results[0])?.results[0]?.Constructor.name ??
          constructorId;

        const rows: Row[] = seasonRaces.map((x) => {
          const results = x.results ?? [];
          const drivers = results.map(driverLabel).join(" / ") || "-";

          const bestPos =
            results.length > 0
              ? String(
                  Math.min(
                    ...results
                      .map((r) => Number(r.position))
                      .filter((n) => Number.isFinite(n))
                  )
                )
              : "-";

          const points = results.reduce((sum, r) => sum + Number(r.points || 0), 0);
          const statuses = results.map((r) => r.Time?.time ?? r.status).join(" | ") || "-";

          return {
            round: x.round,
            raceName: x.raceName,
            date: x.date,
            drivers,
            bestPos,
            points: Number.isFinite(points) ? points.toFixed(0) : "0",
            statuses,
          };
        });

        if (!cancelled) {
          setState({ status: "ready", standing, rows, teamName });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load team",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, constructorId]);

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
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <Link to="/season">← Back to season</Link>

      <h1 style={{ marginBottom: 6 }}>
        {state.teamName} <span style={{ opacity: 0.7 }}>({y})</span>
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
        </div>
      ) : (
        <p>No standings found for this team/year.</p>
      )}

      <h2>Race results</h2>

      {state.rows.length === 0 ? (
        <p>No race results found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
            <thead>
              <tr>
                {["Rnd", "Race", "Drivers", "Best", "Pts", "Time / Status"].map((h) => (
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
              {state.rows.map((r) => (
                <tr key={`${r.round}-${r.raceName}`}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.round}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.raceName}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.drivers}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.bestPos}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.points}
                  </td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                    {r.statuses}
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
