import { useMemo, useRef } from "react";
import type { OpenF1Driver, OpenF1LocationPoint } from "../types/openf1";
import { buildTrackOutline } from "../utils/openf1Track";

type Props = {
  drivers: OpenF1Driver[];
  points: OpenF1LocationPoint[];
  title?: string;

  selectedDriverNumber?: number | null;
  onSelectDriver?: (driverNumber: number | null) => void;
};

type Dot = {
  driver_number: number;
  acronym: string;
  fullName: string;
  team: string;
  color: string;
  x: number;
  y: number;
};

function pickLatestPerDriver(points: OpenF1LocationPoint[]) {
  const map = new Map<number, OpenF1LocationPoint>();
  for (const p of points) {
    const prev = map.get(p.driver_number);
    if (!prev || prev.date < p.date) map.set(p.driver_number, p);
  }
  return [...map.values()];
}

export default function OpenF1Map({
  drivers,
  points,
  title = "Replay map",
  selectedDriverNumber = null,
  onSelectDriver,
}: Props) {
  const latest = useMemo(() => pickLatestPerDriver(points), [points]);
  const outline = useMemo(() => buildTrackOutline(points), [points]);

  const driverByNum = useMemo(() => {
    const m = new Map<number, OpenF1Driver>();
    for (const d of drivers) m.set(d.driver_number, d);
    return m;
  }, [drivers]);

  const boundsRef = useRef<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);

  const dots: Dot[] = useMemo(() => {
    const raw = latest
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
        };
      })
      .filter(Boolean) as Dot[];

    if (raw.length >= 4) {
      const xs = raw.map((r) => r.x);
      const ys = raw.map((r) => r.y);
      const pad = 120;

      boundsRef.current = {
        minX: Math.min(...xs) - pad,
        maxX: Math.max(...xs) + pad,
        minY: Math.min(...ys) - pad,
        maxY: Math.max(...ys) + pad,
      };
    }

    return raw;
  }, [latest, driverByNum]);

  const viewBox = useMemo(() => {
    const b = boundsRef.current;
    if (!b) return "0 0 100 100";
    return `${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}`;
  }, [dots]);

  const hasFocus = typeof selectedDriverNumber === "number";

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

      <svg
        viewBox={viewBox}
        width="100%"
        height="360"
        style={{ display: "block", marginTop: 10, cursor: onSelectDriver ? "pointer" : "default" }}
        onClick={() => {
          // clicking empty map clears focus
          onSelectDriver?.(null);
        }}
      >
        {/* Track outline */}
        {outline.length > 10 && (
          <polyline
            points={outline.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="40"
            opacity="0.08"
          />
        )}

        {/* Car dots */}
        {dots.map((d) => {
          const focused = selectedDriverNumber === d.driver_number;
          const dim = hasFocus && !focused;

          const r = focused ? 48 : 35;
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

              {/* Small label when focused */}
              {focused && (
                <text
                  x={d.x}
                  y={d.y - 55}
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
        Tip: click a dot to focus a driver. Click empty space to clear.
      </div>
    </div>
  );
}
