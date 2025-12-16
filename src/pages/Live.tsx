import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getCircuitLineStringByHints, lineToSvgPath } from "../api/trackGeo";
import {
  getLocationSlice,
  getSessionDrivers,
  listRaceSessions,
  sessionTimeAt,
} from "../api/openf1";
import type {
  OpenF1Driver,
  OpenF1LocationPoint,
  OpenF1Session,
} from "../types/openf1";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

type Dot = {
  driver_number: number;
  s: number; // 0..1 progress along the track path
  name: string;
  color?: string;
};

const VIEW_W = 160;
const VIEW_H = 120;
const PAD = 8;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function formatTime(dt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(dt);
}

function sessionLabel(s: OpenF1Session) {
  const d = new Date(s.date_start);
  const date = isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  return `${s.country_name} — ${s.session_name}${date ? ` (${date})` : ""}`;
}

/**
 * Build a mapper that converts OpenF1 (x,y) to a stable normalized progress value (s in 0..1).
 * This is not perfect physics, but it makes dots move smoothly and consistently.
 *
 * Strategy:
 * - Map OpenF1 x/y into a normalized box [0..1]
 * - Convert to angle around the box center -> s
 */
function makeProgressMapper(points: OpenF1LocationPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  if (xs.length < 2 || ys.length < 2) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = Math.max(1e-9, maxX - minX);
  const h = Math.max(1e-9, maxY - minY);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return (x: number, y: number) => {
    // normalize to roughly circular coordinates
    const nx = (x - cx) / (w / 2);
    const ny = (y - cy) / (h / 2);

    // angle -> progress
    const ang = Math.atan2(ny, nx); // -pi..pi
    const s = (ang + Math.PI) / (2 * Math.PI); // 0..1
    return clamp01(s);
  };
}

export default function Live() {
  const YEAR = 2025;

  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  const [sessions, setSessions] = useState<OpenF1Session[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const session = useMemo(
    () =>
      sessionKey == null
        ? null
        : sessions.find((s) => s.session_key === sessionKey) ?? null,
    [sessions, sessionKey]
  );

  const [drivers, setDrivers] = useState<OpenF1Driver[]>([]);
  const driverMap = useMemo(() => {
    const m = new Map<number, OpenF1Driver>();
    for (const d of drivers) m.set(d.driver_number, d);
    return m;
  }, [drivers]);

  const [geoPath, setGeoPath] = useState<string | null>(null);

  const pathRef = useRef<SVGPathElement | null>(null);

  const [rawPoints, setRawPoints] = useState<OpenF1LocationPoint[]>([]);
  const [dots, setDots] = useState<Dot[]>([]);

  const [t01, setT01] = useState(0);
  const t01Ref = useRef(0);
  const [playing, setPlaying] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    t01Ref.current = t01;
  }, [t01]);

  const displayTime = useMemo(() => {
    if (!session) return null;
    return sessionTimeAt(session, t01);
  }, [session, t01]);

  // 1) Load 2025 race sessions
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoad({ status: "loading" });

        const all = await listRaceSessions(YEAR);
        const races = all.filter((s) =>
          String(s.session_name).toLowerCase().includes("race")
        );
        races.sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start));

        if (cancelled) return;

        setSessions(races);
        setSessionKey(races[0]?.session_key ?? null);
        setLoad({ status: "ready" });
      } catch (e: any) {
        if (cancelled) return;
        setLoad({
          status: "error",
          message: e?.message ?? "Failed to load sessions.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) When session changes: drivers + track path
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session) return;

      setDrivers([]);
      setRawPoints([]);
      setDots([]);
      setGeoPath(null);
      setT01(0);

      try {
        const ds = await getSessionDrivers(session.session_key);
        if (!cancelled) setDrivers(ds);
      } catch {
        if (!cancelled) setDrivers([]);
      }

      try {
        const hints = [
          session.circuit_short_name,
          session.location,
          session.country_name,
          session.session_name,
        ]
          .filter(Boolean)
          .map(String);

        const found = await getCircuitLineStringByHints(hints);
        if (!found) {
          if (!cancelled) setGeoPath(null);
          return;
        }

        const d = lineToSvgPath(found, VIEW_W, VIEW_H, PAD);
        if (!cancelled) setGeoPath(d);
      } catch {
        if (!cancelled) setGeoPath(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // 3) Replay clock (pause while scrubbing)
  useEffect(() => {
    if (!playing || scrubbing) return;

    let raf = 0;
    let last = performance.now();

    const secondsForFullSession = 360;

    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      setT01((t) => {
        const next = t + dt / secondsForFullSession;
        return next >= 1 ? next - 1 : next;
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scrubbing]);

  // 4) Poll OpenF1 slice (depends ONLY on session)
  useEffect(() => {
    let cancelled = false;
    if (!session) return;

    const id = window.setInterval(async () => {
      try {
        const centerIso = sessionTimeAt(session, t01Ref.current).toISOString();
        const slice = await getLocationSlice(session.session_key, centerIso);
        if (cancelled) return;

        const clean = slice.filter(
          (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
        );
        setRawPoints(clean);
      } catch {
        // ignore
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session]);

  // 5) Convert slice -> per-driver progress on the track path
  useEffect(() => {
    if (!rawPoints.length) {
      setDots([]);
      return;
    }

    // latest per driver (THIS is what makes them move)
    const latest = new Map<number, OpenF1LocationPoint>();
    for (const p of rawPoints) {
      const prev = latest.get(p.driver_number);
      if (!prev || prev.date < p.date) latest.set(p.driver_number, p);
    }

    const mapper = makeProgressMapper(rawPoints);
    if (!mapper) {
      setDots([]);
      return;
    }

    const next: Dot[] = [];
    for (const [num, p] of latest) {
      const d = driverMap.get(num);
      next.push({
        driver_number: num,
        s: mapper(p.x, p.y),
        name: d?.full_name ?? `#${num}`,
        color: d?.team_colour ? `#${d.team_colour}` : undefined,
      });
    }

    setDots(next);
  }, [rawPoints, driverMap]);

  // 6) Render dots ON the SVG path (always on-track)
  const drawnDots = useMemo(() => {
    const path = pathRef.current;
    if (!path) return [];

    const len = path.getTotalLength();
    return dots.map((d) => {
      const p = path.getPointAtLength(d.s * len);
      return { ...d, x: p.x, y: p.y };
    });
  }, [dots, geoPath]); // geoPath change recreates the path

  const title = session
    ? `Live • ${session.country_name} • ${session.session_name}`
    : "Live";

  if (load.status === "error") {
    return (
      <div className="container">
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div className="homeKicker">F1Tracker</div>
            <Link className="pill" to="/">
              Back
            </Link>
          </div>
          <div className="small" style={{ marginTop: 12 }}>
            {load.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="homeHeroGrid">
        <div className="homeLeft">
          <div className="homeKicker">F1Tracker</div>
          <h1 className="homeTitle">{title}</h1>

          <div className="homeSub">
            Dots are constrained to the track path (always looks like they drive the circuit).
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <Link className="pill" to="/">
              Back
            </Link>

            <button className="pill pillActive" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Race session ({YEAR})
            </div>
            <select
              value={sessionKey == null ? "" : String(sessionKey)}
              onChange={(e) => {
                const v = e.target.value;
                setSessionKey(v === "" ? null : Number(v));
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(18, 22, 34, .78)",
                color: "var(--text)",
                border: "1px solid rgba(34, 42, 59, .9)",
                outline: "none",
              }}
            >
              <option value="">Select a race…</option>
              {sessions.map((s) => (
                <option key={s.session_key} value={String(s.session_key)}>
                  {sessionLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {/* TIME BAR */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Session time</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {displayTime ? formatTime(displayTime) : "—"}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={t01}
              onMouseDown={() => {
                setScrubbing(true);
                setPlaying(false);
              }}
              onMouseUp={() => setScrubbing(false)}
              onTouchStart={() => {
                setScrubbing(true);
                setPlaying(false);
              }}
              onTouchEnd={() => setScrubbing(false)}
              onChange={(e) => setT01(clamp01(Number(e.target.value)))}
              style={{ width: "100%", marginTop: 8 }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                opacity: 0.6,
                marginTop: 6,
              }}
            >
              <span>Start</span>
              <span>{Math.round(t01 * 100)}%</span>
              <span>End</span>
            </div>
          </div>

          <div className="small" style={{ marginTop: 12 }}>
            Drivers: {drivers.length} • Dots: {drawnDots.length}
          </div>
        </div>

        <div className="homeNext homeNextBig">
          <div className="homeNextTop">
            <span className="badge">Track</span>
            <span className="badge" style={{ marginLeft: 8 }}>
              {geoPath ? "GeoJSON" : "Missing"}
            </span>
          </div>

          <div className="homeMiniMap homeMiniMapBig" style={{ marginTop: 10 }}>
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              width="100%"
              height={340}
              role="img"
              aria-label="Live track"
              style={{ display: "block" }}
            >
              {geoPath ? (
                <>
                  <path
                    d={geoPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    opacity="0.15"
                  />
                  <path
                    ref={pathRef}
                    d={geoPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.92"
                  />
                </>
              ) : (
                <text x="10" y="20" fontSize="10" opacity="0.75">
                  Track not found.
                </text>
              )}

              {drawnDots.map((p) => (
                <circle
                  key={p.driver_number}
                  cx={p.x}
                  cy={p.y}
                  r="3.3"
                  fill={p.color ?? "currentColor"}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
