import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getLocationSlice,
  getPositionSlice,
  getSessionDrivers,
  listRaceSessions,
  sessionTimeAt,
} from "../api/openf1";
import type {
  OpenF1Driver,
  OpenF1LocationPoint,
  OpenF1PositionPoint,
  OpenF1Session,
} from "../types/openf1";
import OpenF1Map from "../components/OpenF1Map";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

function formatLocal(dt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(dt);
}

function latestPerDriverPosition(points: OpenF1PositionPoint[]) {
  const map = new Map<number, OpenF1PositionPoint>();
  for (const p of points) {
    const prev = map.get(p.driver_number);
    if (!prev || prev.date < p.date) map.set(p.driver_number, p);
  }
  return [...map.values()];
}

export default function Live() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const [sessions, setSessions] = useState<OpenF1Session[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<OpenF1Driver[]>([]);
  const [loc, setLoc] = useState<OpenF1LocationPoint[]>([]);
  const [pos, setPos] = useState<OpenF1PositionPoint[]>([]);
  const [t01, setT01] = useState(0.15);
  const [auto, setAuto] = useState(true);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);

  const session = useMemo(
    () => sessions.find((s) => s.session_key === sessionKey) ?? null,
    [sessions, sessionKey]
  );

  // Load sessions when year changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState({ status: "loading" });
        const list = await listRaceSessions(year);
        if (cancelled) return;

        const sorted = (list ?? []).slice().sort((a, b) => a.date_start.localeCompare(b.date_start));
        setSessions(sorted);
        setSessionKey(sorted[0]?.session_key ?? null);
        setSelectedDriverNumber(null);
        setState({ status: "ready" });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load sessions",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year]);

  // Load drivers when session changes
  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;

    (async () => {
      try {
        setState({ status: "loading" });
        const d = await getSessionDrivers(sessionKey);
        if (cancelled) return;

        setDrivers((d ?? []).slice().sort((a, b) => a.driver_number - b.driver_number));
        setLoc([]);
        setPos([]);
        setSelectedDriverNumber(null);
        setState({ status: "ready" });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load drivers",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  // Auto play
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!auto || !session) return;

    const start = performance.now();
    const speed = 0.02; // demo speed

    const tick = (now: number) => {
      const dt = (now - start) / 1000;
      const next = (0.15 + dt * speed) % 1;
      setT01(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [auto, session]);

  // Fetch slices when t changes
  useEffect(() => {
    if (!sessionKey || !session) return;

    let cancelled = false;

    (async () => {
      try {
        const when = sessionTimeAt(session, t01);
        const iso = when.toISOString();

        const [locPoints, posPoints] = await Promise.all([
          getLocationSlice(sessionKey, iso, 650),
          getPositionSlice(sessionKey, iso, 1100),
        ]);

        if (cancelled) return;

        setLoc(locPoints);
        setPos(posPoints);
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to load replay slice",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, session, t01]);

  const order = useMemo(() => {
    const latest = latestPerDriverPosition(pos);
    const driverByNum = new Map(drivers.map((d) => [d.driver_number, d] as const));

    const withDrivers = latest
      .map((p) => {
        const d = driverByNum.get(p.driver_number);
        if (!d) return null;
        return { ...p, driver: d };
      })
      .filter(Boolean) as Array<OpenF1PositionPoint & { driver: OpenF1Driver }>;

    return withDrivers.sort((a, b) => a.position - b.position);
  }, [pos, drivers]);

  const displayTime = useMemo(() => {
    if (!session) return null;
    return sessionTimeAt(session, t01);
  }, [session, t01]);

  const focusedDriver = useMemo(() => {
    if (typeof selectedDriverNumber !== "number") return null;
    return drivers.find((d) => d.driver_number === selectedDriverNumber) ?? null;
  }, [selectedDriverNumber, drivers]);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Replay</h1>
        <Link to="/season">Season</Link>
      </div>

      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Pick a race session, then scrub through it.
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: "1rem",
          margin: "1rem 0",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label>
            <strong>Year</strong>
          </label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            <option value={thisYear}>{thisYear}</option>
            <option value={thisYear - 1}>{thisYear - 1}</option>
            <option value={thisYear - 2}>{thisYear - 2}</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label>
            <strong>Session</strong>
          </label>
          <select
            value={sessionKey ?? ""}
            onChange={(e) => setSessionKey(Number(e.target.value))}
          >
            {sessions.map((s) => (
              <option key={s.session_key} value={s.session_key}>
                {s.meeting_key} — {s.country_name} — {s.circuit_short_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Auto
          </label>

          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {displayTime ? `Local time: ${formatLocal(displayTime)}` : ""}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t01 * 1000)}
          onChange={(e) => setT01(Number(e.target.value) / 1000)}
          disabled={auto}
          style={{ width: "100%" }}
        />

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {auto ? "Playing (demo speed)" : `Scrub: ${Math.round(t01 * 100)}%`}
        </div>

        {focusedDriver && (
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            <strong>Focused:</strong> {focusedDriver.name_acronym} — {focusedDriver.full_name} (
            {focusedDriver.team_name})
          </div>
        )}

        {state.status === "error" && (
          <div style={{ color: "crimson" }}>Error: {state.message}</div>
        )}
      </div>

      {session ? (
        <div style={{ opacity: 0.8 }}>
          <strong>{session.country_name}</strong> • {session.location} •{" "}
          {session.circuit_short_name}
        </div>
      ) : null}

      <OpenF1Map
        drivers={drivers}
        points={loc}
        title="Car positions"
        selectedDriverNumber={selectedDriverNumber}
        onSelectDriver={setSelectedDriverNumber}
      />

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: "1rem",
          margin: "1rem 0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Order</h3>

          {selectedDriverNumber !== null && (
            <button
              type="button"
              onClick={() => setSelectedDriverNumber(null)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: "6px 10px",
                background: "transparent",
                cursor: "pointer",
                height: 34,
                marginTop: 2,
              }}
            >
              Clear focus
            </button>
          )}
        </div>

        {order.length === 0 ? (
          <p>No position data for this moment yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
              <thead>
                <tr>
                  {["Pos", "Driver", "Team", "#"].map((h) => (
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
                {order.map((p) => {
                  const focused = selectedDriverNumber === p.driver_number;
                  const dim = selectedDriverNumber !== null && !focused;

                  return (
                    <tr
                      key={p.driver_number}
                      onClick={() => setSelectedDriverNumber(p.driver_number)}
                      style={{
                        cursor: "pointer",
                        opacity: dim ? 0.25 : 1,
                        background: focused ? "rgba(0,0,0,0.06)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {p.position}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {p.driver.name_acronym} — {p.driver.full_name}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {p.driver.team_name}
                      </td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
                        {p.driver.driver_number}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
