import { useEffect, useMemo, useRef } from "react";
import type { OpenF1Driver, OpenF1LocationPoint } from "../types/openf1";
import { buildTrackOutline } from "../utils/openf1Track";

type Props = {
  drivers: OpenF1Driver[];
  points: OpenF1LocationPoint[];        // raw slice (real)
  smoothPoints?: OpenF1LocationPoint[]; // optional interpolated points (visual)
  title?: string;

  selectedDriverNumber?: number | null;
  onSelectDriver?: (driverNumber: number | null) => void;

  lockCamera?: boolean;

  // Option B: overlay (already converted into OpenF1 x/y space)
  trackOverlay?: Array<{ x: number; y: number }>;
};

type Dot = {
  driver_number: number;
  acronym: string;
  fullName: string;
  team: string;
  color: string;
  x: number;
  y: number;
  date: string;
};

function pickLatestPerDriver(points: OpenF1LocationPoint[]) {
  const map = new Map<number, OpenF1LocationPoint>();
  for (const p of points) {
    const prev = map.get(p.driver_number);
    if (!prev || prev.date < p.date) map.set(p.driver_number, p);
  }
  return [...map.values()];
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

function boundsFromXY(xs: number[], ys: number[], pad: number): Bounds | null {
  if (!xs.length || !ys.length) return null;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  if (maxX - minX < 1e-6 || maxY - minY < 1e-6) return null;
  return { minX, maxX, minY, maxY };
}

function expand(prev: Bounds, next: Bounds): Bounds {
  return {
    minX: Math.min(prev.minX, next.minX),
    maxX: Math.max(prev.maxX, next.maxX),
    minY: Math.min(prev.minY, next.minY),
    maxY: Math.max(prev.maxY, next.maxY),
  };
}

function ensureMinSize(b: Bounds, minW: number, minH: number): Bounds {
  let { minX, maxX, minY, maxY } = b;

  let w = maxX - minX;
  let h = maxY - minY;

  if (w < minW) {
    const cx = (minX + maxX) / 2;
    minX = cx - minW / 2;
    maxX = cx + minW / 2;
    w = minW;
  }

  if (h < minH) {
    const cy = (minY + maxY) / 2;
    minY = cy - minH / 2;
    maxY = cy + minH / 2;
    h = minH;
  }

  return { minX, maxX, minY, maxY };
}

export default function OpenF1Map({
  drivers,
  points,
  smoothPoints,
  title = "Car positions",
  selectedDriverNumber = null,
  onSelectDriver,
  lockCamera = false,
  trackOverlay,
}: Props) {
  const visualPoints = smoothPoints ?? points;

  const latest = useMemo(() => pickLatestPerDriver(visualPoints), [visualPoints]);
  const outline = useMemo(() => buildTrackOutline(points), [points]);

  const driverByNum = useMemo(() => {
    const m = new Map<number, OpenF1Driver>();
    for (const d of drivers) m.set(d.driver_number, d);
    return m;
  }, [drivers]);

  const dots: Dot[] = useMemo(() => {
    return latest
      .map((p) => {
        const d = driverByNum.get(p.driver_number);
        if (!d) return null;
        return {
          driver_number: p.driver_number,
          acronym: d.name_acronym,
          fullName: d.full_name,
          team: d.team_name,
          color: d.team_colour ? `#${d.team_colour}` : "#111",
          x: p.x,
          y: p.y,
          date: p.date,
        };
      })
      .filter(Boolean) as Dot[];
  }, [latest, driverByNum]);

  const focusedDot = useMemo(() => {
    if (typeof selectedDriverNumber !== "number") return null;
    return dots.find((d) => d.driver_number === selectedDriverNumber) ?? null;
  }, [dots, selectedDriverNumber]);

  const candidateBounds = useMemo(() => {
    // Prefer overlay bounds (best “instant fit” once available)
    if (trackOverlay && trackOverlay.length >= 10) {
      const xs = trackOverlay.map((p) => p.x);
      const ys = trackOverlay.map((p) => p.y);
      return boundsFromXY(xs, ys, 260);
    }

    // Best: traced outline
    if (outline.length >= 10) {
      const xs = outline.map((p) => p.x);
      const ys = outline.map((p) => p.y);
      return boundsFromXY(xs, ys, 220);
    }

    // Next: raw slice cloud
    if (points.length >= 8) {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      return boundsFromXY(xs, ys, 280);
    }

    // Fallback: dots
    if (dots.length >= 2) {
      const xs = dots.map((d) => d.x);
      const ys = dots.map((d) => d.y);
      return boundsFromXY(xs, ys, 320);
    }

    return null;
  }, [trackOverlay, outline, points, dots]);

  const stableBoundsRef = useRef<Bounds | null>(null);

  useEffect(() => {
    if (!candidateBounds) return;

    const prev = stableBoundsRef.current;

    const candW = candidateBounds.maxX - candidateBounds.minX;
    const candH = candidateBounds.maxY - candidateBounds.minY;

    const minW = Math.max(6000, candW * 1.2);
    const minH = Math.max(6000, candH * 1.2);

    const safeCandidate = ensureMinSize(candidateBounds, minW, minH);

    if (!prev) {
      stableBoundsRef.current = safeCandidate;
      return;
    }

    stableBoundsRef.current = expand(prev, safeCandidate);
  }, [candidateBounds]);

  const viewBox = useMemo(() => {
    const b = stableBoundsRef.current;

    if (!b) return "-10000 -10000 20000 20000";

    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;

    if (lockCamera && focusedDot) {
      const zoom = 0.55;
      const vw = w * zoom;
      const vh = h * zoom;
      const cx = focusedDot.x;
      const cy = focusedDot.y;
      return `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
    }

    return `${b.minX} ${b.minY} ${w} ${h}`;
  }, [lockCamera, focusedDot]);

  const hasFocus = typeof selectedDriverNumber === "number";
  const tracedOpacity = trackOverlay && trackOverlay.length >= 10 ? 0.06 : 0.14;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: "1rem",
        margin: "1rem 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {hasFocus && (
            <button
              type="button"
              onClick={() => onSelectDriver?.(null)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: "6px 10px",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Clear focus
            </button>
          )}

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {dots.length ? `${dots.length} cars` : "No data"}
          </div>
        </div>
      </div>

      {dots.length === 0 && (
        <div style={{ opacity: 0.65, fontSize: 14, marginTop: 12 }}>
          No telemetry data at this moment.
        </div>
      )}

      <svg
        viewBox={viewBox}
        width="100%"
        height="360"
        style={{ display: "block", marginTop: 10, cursor: onSelectDriver ? "pointer" : "default" }}
        onClick={() => onSelectDriver?.(null)}
      >
        {/* Geo overlay (already in OpenF1 x/y space) */}
        {trackOverlay && trackOverlay.length >= 10 ? (
          <polyline
            points={trackOverlay.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="38"
            opacity="0.22"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {/* Traced outline (fallback / assist) */}
        {outline.length >= 10 ? (
          <polyline
            points={outline.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="40"
            opacity={tracedOpacity}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          points.map((p, i) => (
            <circle
              key={`${p.driver_number}-${p.date}-${i}`}
              cx={p.x}
              cy={p.y}
              r={8}
              opacity={0.03}
              fill="currentColor"
            />
          ))
        )}

        {dots.map((d) => {
          const focused = selectedDriverNumber === d.driver_number;
          const dim = hasFocus && !focused;

          const r = focused ? 52 : 40; // bigger for easier clicking
          const opacity = dim ? 0.2 : 1;

          return (
            <g
              key={d.driver_number}
              opacity={opacity}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDriver?.(d.driver_number);
              }}
            >
              <circle cx={d.x} cy={d.y} r={r} fill={d.color} />
              <text
                x={d.x}
                y={d.y + 10}
                textAnchor="middle"
                fontSize={focused ? 40 : 36}
                fill="#fff"
              >
                {d.acronym}
              </text>

              {focused && (
                <text
                  x={d.x}
                  y={d.y - 60}
                  textAnchor="middle"
                  fontSize={18}
                  fill="currentColor"
                  opacity={0.9}
                >
                  {d.fullName}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
        Smooth rendering uses client-side interpolation; data still comes from OpenF1.
      </div>
    </div>
  );
}
