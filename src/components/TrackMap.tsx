import { useEffect, useMemo, useRef, useState } from "react";
import { getCircuitLineString, lineToSvgPath } from "../api/trackGeo";

type Props = {
  circuitId: string;
  demoCars?: number;
  replayT?: number;

  // NEW:
  variant?: "card" | "embedded";
  height?: number;
};

function hashToUnit(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function getFallbackPath(circuitId: string): string {
  const known: Record<string, string> = {
    monza:
      "M 20 60 C 40 10, 120 10, 140 60 C 160 110, 80 120, 60 85 C 45 60, 70 45, 85 55 C 110 70, 100 95, 80 92 C 55 88, 40 80, 20 60 Z",
    silverstone:
      "M 25 65 C 35 25, 80 20, 105 35 C 125 45, 130 70, 110 85 C 95 97, 65 98, 50 88 C 35 78, 20 85, 25 65 Z",
  };

  return (
    known[circuitId] ??
    "M 30 60 C 30 25, 130 25, 130 60 C 130 95, 30 95, 30 60 Z"
  );
}

export default function TrackMap({
  circuitId,
  demoCars = 6,
  replayT,
  variant = "card",
  height = 260,
}: Props) {
  const [geoPath, setGeoPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const line = await getCircuitLineString(circuitId);
        if (!line) {
          if (!cancelled) setGeoPath(null);
          return;
        }
        const d2 = lineToSvgPath(line, 160, 120, 8);
        if (!cancelled) setGeoPath(d2);
      } catch {
        if (!cancelled) setGeoPath(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [circuitId]);

  const d = useMemo(
    () => geoPath ?? getFallbackPath(circuitId),
    [geoPath, circuitId]
  );

  const pathRef = useRef<SVGPathElement | null>(null);

  const cars = useMemo(() => {
    const base = hashToUnit(circuitId);
    return Array.from({ length: demoCars }, (_, i) => {
      const seed = hashToUnit(`${circuitId}-${i}`);
      return {
        id: `${circuitId}-${i}`,
        start: (base + i / demoCars) % 1,
        speedMul: 0.85 + seed * 0.4,
      };
    });
  }, [circuitId, demoCars]);

  const [points, setPoints] = useState<Array<{ id: string; x: number; y: number }>>([]);

  function computeFromT(t: number) {
    const path = pathRef.current;
    if (!path) return;

    const len = path.getTotalLength();
    const next = cars.map((c) => {
      const tt = (c.start + t * c.speedMul) % 1;
      const p = path.getPointAtLength(tt * len);
      return { id: c.id, x: p.x, y: p.y };
    });
    setPoints(next);
  }

  useEffect(() => {
    if (typeof replayT !== "number") return;
    computeFromT(Math.max(0, Math.min(1, replayT)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayT, d, cars]);

  useEffect(() => {
    if (typeof replayT === "number") return;

    let raf = 0;
    const startMs = performance.now();
    const demoSpeed = 1.2;

    function tick(now: number) {
      const path = pathRef.current;
      if (!path) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const lapsPerMs = demoSpeed / 60000;
      const t = ((now - startMs) * lapsPerMs) % 1;
      computeFromT(t);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayT, d, cars]);

  const labelRight = typeof replayT === "number" ? "Replay" : "Auto";
  const trackLabel = geoPath ? "GeoJSON" : "Placeholder";

  const inner = (
    <>
      {variant === "card" ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <h3 style={{ margin: 0 }}>Track map</h3>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {trackLabel} • {labelRight}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: variant === "card" ? 10 : 0 }}>
        <svg
          viewBox="0 0 160 120"
          width="100%"
          height={height}
          role="img"
          aria-label={`Track map for ${circuitId}`}
          style={{ display: "block" }}
        >
          <path d={d} fill="none" stroke="currentColor" strokeWidth="10" opacity="0.15" />

          <path
            ref={pathRef}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.92"
          />

          {points.map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y} r="3.3" />
          ))}

          {variant === "card" ? (
            <text x="8" y="16" fontSize="10" opacity="0.75">
              {circuitId}
            </text>
          ) : null}
        </svg>
      </div>
    </>
  );

  if (variant === "embedded") return inner;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: "1rem",
        margin: "1rem 0",
      }}
    >
      {inner}
    </div>
  );
}
