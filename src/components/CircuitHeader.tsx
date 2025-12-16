import type { JolpicaRace } from "../types/f1";

export default function CircuitHeader({ race }: { race: JolpicaRace }) {
  const loc = race.Circuit.Location;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: "1rem",
        margin: "1rem 0",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>{race.Circuit.circuitName}</h2>
        <span
          style={{
            fontSize: 12,
            padding: "2px 8px",
            border: "1px solid #ccc",
            borderRadius: 999,
            opacity: 0.9,
          }}
          title="circuitId"
        >
          {race.Circuit.circuitId}
        </span>
      </div>

      <div style={{ opacity: 0.85, marginTop: 6 }}>
        {loc.locality}, {loc.country}
      </div>
    </div>
  );
}
