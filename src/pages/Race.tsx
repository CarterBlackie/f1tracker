import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRace, getRaceResults, raceStartLocal } from "../api/f1";
import type { JolpicaRace, JolpicaResult, JolpicaSession } from "../types/f1";
import CircuitHeader from "../components/CircuitHeader";
import TrackMap from "../components/TrackMap";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; race: JolpicaRace; results: JolpicaResult[] | null };

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
  return r.Time?.time ?? r.status;
}

export default function Race() {
  const { year, round } = useParams();
  const [state, setState] = useState<State>({ status: "loading" });

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

        if (!cancelled) {
          setState({
            status: "ready",
            race,
            results: res?.results?.length ? res.results : null,
          });
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
    return <div style={{ padding: "2rem" }}>Loading…</div>;
  }

  if (state.status === "error") {
    return (
      <div style={{ padding: "2rem" }}>
        <p>Error: {state.message}</p>
        <Link to="/season">Back to season</Link>
      </div>
    );
  }

  const { race, results } = state;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <Link to="/season">← Back to season</Link>

      <h1 style={{ marginBottom: "0.25rem" }}>{race.raceName}</h1>
      <div style={{ opacity: 0.85, marginBottom: "0.75rem" }}>
        {race.Circuit.Location.locality}, {race.Circuit.Location.country}
      </div>

      {/* Option 2 visuals */}
      <CircuitHeader race={race} />
      <TrackMap circuitId={race.Circuit.circuitId} />

      {results ? (
        <>
          <h2>Race results</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
              <thead>
                <tr>
                  {["Pos", "Driver", "Team", "Grid", "Laps", "Time / Status", "Pts"].map((h) => (
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
                {results.map((r) => (
                  <tr key={`${r.position}-${r.Driver.driverId}-${r.Constructor.constructorId}`}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {r.position}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {driverName(r)}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {r.Constructor.name}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {r.grid ?? "-"}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {r.laps ?? "-"}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {finishOrStatus(r)}
                    </td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                      {r.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <h2>Weekend sessions</h2>

          <ul style={{ paddingLeft: "1.25rem" }}>
            {sessions.map((x) => (
              <li key={x.label} style={{ marginBottom: "0.5rem" }}>
                <strong>{x.label}:</strong> {formatLocal(sessionToLocal(x.s))}
              </li>
            ))}
          </ul>

          <p>
            <strong>Race start:</strong> {formatLocal(raceStartLocal(race))}
          </p>
        </>
      )}
    </div>
  );
}
