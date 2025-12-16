import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getLocationSlice,
  getPositionSlice,
  getSessionDrivers,
  listRaceSessions,
  sessionTimeAt,
  getLapsSlice,
} from "../api/openf1";
import type {
  OpenF1Driver,
  OpenF1LocationPoint,
  OpenF1PositionPoint,
  OpenF1Session,
  OpenF1Lap,
} from "../types/openf1";
import OpenF1Map from "../components/OpenF1Map";
import { resetTrackOutline } from "../utils/openf1Track";

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

function latestPerDriverLocation(points: OpenF1LocationPoint[]) {
  const map = new Map<number, OpenF1LocationPoint>();
  for (const p of points) {
    const prev = map.get(p.driver_number);
    if (!prev || prev.date < p.date) map.set(p.driver_number, p);
  }
  return map;
}

function latestLapPerDriver(laps: OpenF1Lap[]) {
  const map = new Map<number, OpenF1Lap>();
  for (const l of laps) {
    const prev = map.get(l.driver_number);
    if (!prev || prev.date_start < l.date_start) {
      map.set(l.driver_number, l);
    }
  }
  return map;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const INTERP_MS = 1200; // fixed window so we don’t “collapse” when API repeats buckets

export default function Live() {
  const thisYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(thisYear);
  const [sessions, setSessions] = useState<OpenF1Session[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<OpenF1Driver[]>([]);

  const [loc, setLoc] = useState<OpenF1LocationPoint[]>([]);
  const [pos, setPos] = useState<OpenF1PositionPoint[]>([]);
  const [laps, setLaps] = useState<OpenF1Lap[]>([]);

  // visual-only (interpolated)
  const [smoothLoc, setSmoothLoc] = useState<OpenF1LocationPoint[]>([]);

  const [t01, setT01] = useState(0.5);
  const [auto, setAuto] = useState(true);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);
  const [lockCamera, setLockCamera] = useState(false);

  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);

  const session = useMemo(
    () => sessions.find((s) => s.session_key === sessionKey) ?? null,
    [sessions, sessionKey]
  );

  // interpolation buffers
  const prevSliceRef = useRef<Map<number, OpenF1LocationPoint> | null>(null);
  const currSliceRef = useRef<Map<number, OpenF1LocationPoint> | null>(null);

  // time when the current interpolation window started
  const interpStartRef = useRef<number>(0);

  // Load sessions when year changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState({ status: "loading" });
        const list = await listRaceSessions(year);
        if (cancelled) return;

        const sorted = (list ?? [])
          .slice()
          .sort((a, b) => a.date_start.localeCompare(b.date_start));

        setSessions(sorted);
        setSessionKey(sorted[0]?.session_key ?? null);

        setSelectedDriverNumber(null);
        setLockCamera(false);
        setRateLimitUntil(null);

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
    resetTrackOutline();
    let cancelled = false;

    (async () => {
      try {
        setState({ status: "loading" });
        const d = await getSessionDrivers(sessionKey);
        if (cancelled) return;

        setDrivers((d ?? []).slice().sort((a, b) => a.driver_number - b.driver_number));

        setLoc([]);
        setPos([]);
        setLaps([]);
        setSmoothLoc([]);

        prevSliceRef.current = null;
        currSliceRef.current = null;
        interpStartRef.current = performance.now();

        setSelectedDriverNumber(null);
        setLockCamera(false);
        setRateLimitUntil(null);

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

  // Auto play (network-safe cadence)
  useEffect(() => {
    if (!auto || !session) return;
    if (rateLimitUntil && Date.now() < rateLimitUntil) return;

    const tickMs = 600;
    const speedPerTick = 0.0006;

    const id = window.setInterval(() => {
      setT01((prev) => (prev + speedPerTick) % 1);
    }, tickMs);

    return () => window.clearInterval(id);
  }, [auto, session, rateLimitUntil]);

  // Fetch slices when t changes
  const lastFetchRef = useRef<string>("");

  useEffect(() => {
    if (!sessionKey || !session) return;
    if (rateLimitUntil && Date.now() < rateLimitUntil) return;

    let cancelled = false;

    (async () => {
      try {
        const when = sessionTimeAt(session, t01);
        const iso = when.toISOString();

        const fetchKey = `${sessionKey}-${iso.slice(0, 19)}`;
        if (fetchKey === lastFetchRef.current) return;
        lastFetchRef.current = fetchKey;

        const [locPoints, posPoints, lapPoints] = await Promise.all([
          getLocationSlice(sessionKey, iso, 650),
          getPositionSlice(sessionKey, iso, 1100),
          getLapsSlice(sessionKey, iso, 1000 * 60 * 12),
        ]);

        if (cancelled) return;

        // If this moment has no telemetry, skip ahead a bit (Auto mode only)
        if (auto && locPoints.length === 0 && posPoints.length === 0) {
          setT01((t) => Math.min(1, t + 0.01));
          return;
        }

        setLoc(locPoints);
        setPos(posPoints);
        setLaps(lapPoints);

        // update interpolation buffers
        const now = performance.now();
        const nextMap = latestPerDriverLocation(locPoints);

        prevSliceRef.current = currSliceRef.current;
        currSliceRef.current = nextMap;

        // start a fresh interpolation window now
        interpStartRef.current = now;

        // first slice: no prev yet
        if (!prevSliceRef.current) {
          prevSliceRef.current = nextMap;
        }

        if (state.status === "error") setState({ status: "ready" });
      } catch (e) {
        if (cancelled) return;

        const msg = e instanceof Error ? e.message : "Failed to load replay slice";

        if (msg.includes("HTTP 429")) {
          const until = Date.now() + 15000;
          setRateLimitUntil(until);
          setState({ status: "error", message: "Rate limited (429). Paused Auto for 15s." });
          return;
        }

        setState({ status: "error", message: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, session, t01, rateLimitUntil, state.status, auto]);

  // Interpolation loop: commit ~30fps
  useEffect(() => {
    let raf = 0;
    let lastCommit = 0;

    const tick = (now: number) => {
      const prevMap = prevSliceRef.current;
      const currMap = currSliceRef.current;

      if (prevMap && currMap) {
        const t0 = interpStartRef.current;
        const t = Math.max(0, Math.min(1, (now - t0) / INTERP_MS));

        if (now - lastCommit >= 33) {
          const out: OpenF1LocationPoint[] = [];

          for (const [driverNum, currP] of currMap.entries()) {
            const prevP = prevMap.get(driverNum);
            if (!prevP) continue;

            out.push({
              ...currP,
              x: lerp(prevP.x, currP.x, t),
              y: lerp(prevP.y, currP.y, t),
              z: lerp(prevP.z, currP.z, t),
              date: currP.date,
            });
          }

          setSmoothLoc(out);
          lastCommit = now;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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

  const lapByDriver = useMemo(() => latestLapPerDriver(laps), [laps]);

  const displayTime = useMemo(() => {
    if (!session) return null;
    return sessionTimeAt(session, t01);
  }, [session, t01]);

  const focusedDriver = useMemo(() => {
    if (typeof selectedDriverNumber !== "number") return null;
    return drivers.find((d) => d.driver_number === selectedDriverNumber) ?? null;
  }, [selectedDriverNumber, drivers]);

  const focusedPosition = useMemo(() => {
    if (typeof selectedDriverNumber !== "number") return null;
    const p = order.find((x) => x.driver_number === selectedDriverNumber);
    return p?.position ?? null;
  }, [selectedDriverNumber, order]);

  const focusedLap = useMemo(() => {
    if (typeof selectedDriverNumber !== "number") return null;
    return lapByDriver.get(selectedDriverNumber)?.lap_number ?? null;
  }, [lapByDriver, selectedDriverNumber]);

  const focusedLocMap = useMemo(() => latestPerDriverLocation(loc), [loc]);

  const focusedLastUpdate = useMemo(() => {
    if (typeof selectedDriverNumber !== "number") return null;
    const p = focusedLocMap.get(selectedDriverNumber);
    if (!p) return null;
    return new Date(p.date);
  }, [focusedLocMap, selectedDriverNumber]);

  const rateMsg =
    rateLimitUntil && Date.now() < rateLimitUntil
      ? `Rate limited. Try again in ${Math.ceil((rateLimitUntil - Date.now()) / 1000)}s.`
      : null;

  // ---- Layout-stability styles (prevents grow/shrink) ----
  const cardStyle: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "1rem",
    margin: "1rem 0",
  };

  const stableRow: React.CSSProperties = {
    minHeight: 22,
    display: "flex",
    alignItems: "center",
  };

  const focusedPanelStyle: React.CSSProperties = {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: "0.75rem",
    background: "rgba(0,0,0,0.03)",
    display: "grid",
    gap: 6,
    minHeight: 150,
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Replay</h1>
        <Link to="/season">Season</Link>
      </div>

      <p style={{ opacity: 0.8, marginTop: 8 }}>Pick a race session, then scrub through it.</p>

      <div style={{ ...cardStyle, display: "grid", gap: "0.75rem" }}>
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
          <select value={sessionKey ?? ""} onChange={(e) => setSessionKey(Number(e.target.value))}>
            {sessions.map((s) => (
              <option key={s.session_key} value={s.session_key}>
                {s.meeting_key} — {s.country_name} — {s.circuit_short_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
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

        <div style={stableRow}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {auto ? "Playing (smooth)" : `Scrub: ${Math.round(t01 * 100)}%`}
          </div>
        </div>

        <div style={focusedPanelStyle}>
          {focusedDriver ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <strong>Focused driver</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDriverNumber(null);
                    setLockCamera(false);
                  }}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: "6px 10px",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              </div>

              <div>
                <strong>{focusedDriver.name_acronym}</strong> — {focusedDriver.full_name}
              </div>

              <div style={{ opacity: 0.85 }}>
                Team: {focusedDriver.team_name} • Car #{focusedDriver.driver_number}
              </div>

              <div style={{ opacity: 0.85 }}>
                Current position: <strong>{focusedPosition ?? "-"}</strong>
              </div>

              <div style={{ opacity: 0.85 }}>
                Lap: <strong>{focusedLap ?? "-"}</strong>
              </div>

              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Last update: {focusedLastUpdate ? formatLocal(focusedLastUpdate) : "-"}
              </div>

              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={lockCamera}
                  onChange={(e) => setLockCamera(e.target.checked)}
                />
                Lock camera to driver
              </label>
            </>
          ) : (
            <div style={{ opacity: 0.75 }}>
              <strong>No driver selected</strong>
              <div style={{ marginTop: 6, fontSize: 12 }}>Click a dot or a row to focus a driver.</div>
            </div>
          )}
        </div>

        <div style={stableRow}>
          {rateMsg ? (
            <div style={{ color: "crimson" }}>{rateMsg}</div>
          ) : state.status === "error" ? (
            <div style={{ color: "crimson" }}>{state.message}</div>
          ) : (
            <div style={{ opacity: 0.6, fontSize: 12 }}>&nbsp;</div>
          )}
        </div>
      </div>

      {session ? (
        <div style={{ opacity: 0.8 }}>
          <strong>{session.country_name}</strong> • {session.location} • {session.circuit_short_name}
        </div>
      ) : null}

      <OpenF1Map
        drivers={drivers}
        points={loc}
        smoothPoints={smoothLoc}
        title="Car positions"
        selectedDriverNumber={selectedDriverNumber}
        onSelectDriver={setSelectedDriverNumber}
        lockCamera={lockCamera}
      />

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Order</h3>

          {selectedDriverNumber !== null && (
            <button
              type="button"
              onClick={() => {
                setSelectedDriverNumber(null);
                setLockCamera(false);
              }}
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
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}>
              <thead>
                <tr>
                  {["Pos", "Lap", "Driver", "Team", "#"].map((h) => (
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
                  const lap = lapByDriver.get(p.driver_number)?.lap_number ?? null;

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
                        {lap ?? "-"}
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
