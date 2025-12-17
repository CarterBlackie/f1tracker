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

type Dot = {
  driver_number: number;
  s: number; // 0..1
  name: string;
  color?: string;
};

type DrawnDot = Dot & { x: number; y: number };

const VIEW_W = 160;
const VIEW_H = 120;
const PAD = 4;

const SVG_HEIGHT = 520;
const TRACK_BG_STROKE = 12;
const TRACK_FG_STROKE = 7;

const SMOOTH_PER_SEC = 2.0;
const MAX_DS_PER_SEC = 0.35;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function mod1(v: number) {
  const m = v % 1;
  return m < 0 ? m + 1 : m;
}

function shortestWrapDiff(from: number, to: number) {
  const d = mod1(to - from);
  return d > 0.5 ? d - 1 : d;
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

function makeProgressMapper(points: OpenF1LocationPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  if (xs.length < 2 || ys.length < 2) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const w = Math.max(1e-9, maxX - minX);
  const h = Math.max(1e-9, maxY - minY);

  return (x: number, y: number) => {
    const nx = (x - cx) / (w / 2);
    const ny = (y - cy) / (h / 2);
    const ang = Math.atan2(ny, nx);
    return clamp01((ang + Math.PI) / (2 * Math.PI));
  };
}

export default function Live() {
  const YEAR = 2025;

  const [error, setError] = useState<string | null>(null);

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

  const targetRef = useRef<Map<number, Dot>>(new Map());
  const targetMetaRef = useRef<
    Map<number, { s: number; tMs: number; dsPerSec: number }>
  >(new Map());

  const currentRef = useRef<Map<number, number>>(new Map());
  const unwrappedLapRef = useRef<Map<number, number>>(new Map());

  const [drawnDots, setDrawnDots] = useState<DrawnDot[]>([]);

  const [t01, setT01] = useState(0);
  const t01Ref = useRef(0);
  const [playing, setPlaying] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(1);

  const [lapDriver, setLapDriver] = useState<number | null>(null);
  const [lapNow, setLapNow] = useState<{ lap: number; pct: number } | null>(null);

  useEffect(() => {
    t01Ref.current = t01;
  }, [t01]);

  const displayTime = useMemo(() => {
    if (!session) return null;
    return sessionTimeAt(session, t01);
  }, [session, t01]);

  useEffect(() => {
    if (!drivers.length) return;
    if (lapDriver != null) return;
    setLapDriver(drivers[0].driver_number);
  }, [drivers, lapDriver]);

  // Load sessions
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);

        const all = await listRaceSessions(YEAR);
        const races = all
          .filter((s) => s.session_name.toLowerCase().includes("race"))
          .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start));

        if (cancelled) return;

        setSessions(races);
        setSessionKey(races[0]?.session_key ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load sessions");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Session change reset
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session) return;

      setDrivers([]);
      setRawPoints([]);
      setDrawnDots([]);
      setLapNow(null);

      targetRef.current.clear();
      targetMetaRef.current.clear();
      currentRef.current.clear();
      unwrappedLapRef.current.clear();

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
        ]
          .filter(Boolean)
          .map(String);

        const found = await getCircuitLineStringByHints(hints);
        if (!cancelled)
          setGeoPath(found ? lineToSvgPath(found, VIEW_W, VIEW_H, PAD) : null);
      } catch {
        if (!cancelled) setGeoPath(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Second-for-second playback scaled by speed
  useEffect(() => {
    if (!session || !playing || scrubbing) return;

    let raf = 0;
    let last = performance.now();

    const startMs = Date.parse(session.date_start);
    const endMs = session.date_end
      ? Date.parse(session.date_end)
      : startMs + 2 * 60 * 60 * 1000;

    const durationMs = Math.max(1, endMs - startMs);

    function tick(now: number) {
      const dtMs = (now - last) * speed;
      last = now;

      setT01((t) => mod1(t + dtMs / durationMs));
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [session, playing, scrubbing, speed]);

  // Poll telemetry
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const id = setInterval(async () => {
      try {
        const iso = sessionTimeAt(session, t01Ref.current).toISOString();
        const slice = await getLocationSlice(session.session_key, iso);
        if (!cancelled) {
          setRawPoints(
            slice.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
          );
        }
      } catch {
        // ignore
      }
    }, 400);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session]);

  // Convert slice -> targets + ds/dt estimation
  useEffect(() => {
    if (!rawPoints.length) return;

    const latest = new Map<number, OpenF1LocationPoint>();
    for (const p of rawPoints) {
      const prev = latest.get(p.driver_number);
      if (!prev || prev.date < p.date) latest.set(p.driver_number, p);
    }

    const mapper = makeProgressMapper(rawPoints);
    if (!mapper) return;

    const nowMs = performance.now();
    const nextTargets = new Map<number, Dot>();

    for (const [num, p] of latest) {
      const d = driverMap.get(num);
      const s = mapper(p.x, p.y);

      nextTargets.set(num, {
        driver_number: num,
        s,
        name: d?.full_name ?? `#${num}`,
        color: d?.team_colour ? `#${d.team_colour}` : undefined,
      });

      if (!currentRef.current.has(num)) currentRef.current.set(num, s);
      if (!unwrappedLapRef.current.has(num)) unwrappedLapRef.current.set(num, 0);

      const meta = targetMetaRef.current.get(num);
      if (!meta) {
        targetMetaRef.current.set(num, { s, tMs: nowMs, dsPerSec: 0 });
      } else {
        const dt = Math.max(0.001, (nowMs - meta.tMs) / 1000);
        const diff = shortestWrapDiff(meta.s, s);
        let dsPerSec = diff / dt;

        dsPerSec = Math.max(-MAX_DS_PER_SEC, Math.min(MAX_DS_PER_SEC, dsPerSec));
        const blended = meta.dsPerSec * 0.6 + dsPerSec * 0.4;

        targetMetaRef.current.set(num, { s, tMs: nowMs, dsPerSec: blended });
      }
    }

    targetRef.current = nextTargets;
  }, [rawPoints, driverMap]);

  // RAF: predict target continuously
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const path = pathRef.current;
      if (!path || !geoPath) {
        raf = requestAnimationFrame(frame);
        return;
      }

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const len = path.getTotalLength();
      const out: DrawnDot[] = [];

      for (const [num, base] of targetRef.current) {
        const meta = targetMetaRef.current.get(num);

        let targetS = base.s;
        if (meta) {
          const age = Math.max(0, (now - meta.tMs) / 1000);
          targetS = mod1(meta.s + meta.dsPerSec * age);
        }

        const c0 = currentRef.current.get(num) ?? targetS;
        const diff = shortestWrapDiff(c0, targetS);

        const step = 1 - Math.exp(-SMOOTH_PER_SEC * dt);
        const c1 = mod1(c0 + diff * step);

        currentRef.current.set(num, c1);

        const lapPrev = unwrappedLapRef.current.get(num) ?? 0;
        unwrappedLapRef.current.set(num, lapPrev + diff * step);

        const p = path.getPointAtLength(c1 * len);
        out.push({ ...base, s: c1, x: p.x, y: p.y });
      }

      out.sort((a, b) => a.driver_number - b.driver_number);
      setDrawnDots(out);

      if (lapDriver != null) {
        const lapU = unwrappedLapRef.current.get(lapDriver);
        const curS = currentRef.current.get(lapDriver);
        if (lapU != null && curS != null) {
          setLapNow({
            lap: Math.max(1, Math.floor(lapU) + 1),
            pct: Math.round(mod1(curS) * 100),
          });
        } else {
          setLapNow(null);
        }
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geoPath, lapDriver]);

  return (
    <div className="container">
      <div className="homeHeroGrid">
        <div className="homeLeft">
          <div className="homeKicker">F1Tracker</div>

          <h1 className="homeTitle">
            {session
              ? `Live • ${session.country_name} • ${session.session_name}`
              : "Live"}
          </h1>

          <div className="homeSub">Continuous dots (no stop/start).</div>

          {error ? (
            <div className="small" style={{ marginTop: 10 }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <Link className="pill" to="/">
              Back
            </Link>

            <button className="pill pillActive" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              {[0.5, 1, 2, 4].map((v) => (
                <button
                  key={v}
                  className={`pill ${speed === v ? "pillActive" : ""}`}
                  onClick={() => setSpeed(v as 0.5 | 1 | 2 | 4)}
                  type="button"
                >
                  {v}×
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Race session ({YEAR})
            </div>
            <select
              value={sessionKey ?? ""}
              onChange={(e) => setSessionKey(Number(e.target.value))}
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
              {sessions.map((s) => (
                <option key={s.session_key} value={s.session_key}>
                  {sessionLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Lap counter driver</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {lapNow ? `Lap ${lapNow.lap} • ${lapNow.pct}%` : "—"}
              </div>
            </div>

            <select
              value={lapDriver ?? ""}
              onChange={(e) => setLapDriver(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                marginTop: 8,
                background: "rgba(18, 22, 34, .78)",
                color: "var(--text)",
                border: "1px solid rgba(34, 42, 59, .9)",
                outline: "none",
              }}
            >
              {drivers.map((d) => (
                <option key={d.driver_number} value={d.driver_number}>
                  {d.full_name ?? `#${d.driver_number}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Session time</span>
              <span style={{ fontSize: 12, opacity: 0.85 }}>
                {displayTime ? formatTime(displayTime) : "—"}
              </span>
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

            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
              Speed: {speed}× • Dots: {drawnDots.length}
            </div>
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
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height={SVG_HEIGHT}>
              {geoPath ? (
                <>
                  <path
                    d={geoPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={TRACK_BG_STROKE}
                    opacity="0.15"
                  />
                  <path
                    ref={pathRef}
                    d={geoPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={TRACK_FG_STROKE}
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

              {drawnDots.map((d) => (
                <circle
                  key={d.driver_number}
                  cx={d.x}
                  cy={d.y}
                  r="3.6"
                  fill={d.color ?? "currentColor"}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
