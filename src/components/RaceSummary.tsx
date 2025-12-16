import type { JolpicaResult } from "../types/f1";

function displayDriver(r: JolpicaResult) {
  const d = r.Driver;
  return d.code ? `${d.code} — ${d.familyName}` : `${d.givenName} ${d.familyName}`;
}

function isDNFStatus(status: string) {
  const s = status.toLowerCase();

  // Ergast-style statuses include things like:
  // "Finished", "+1 Lap", "+2 Laps", "Accident", "Engine", "Disqualified", etc.
  if (s === "finished") return false;
  if (s.startsWith("+")) return false; // classified, just lapped
  return true;
}

export default function RaceSummary({ results }: { results: JolpicaResult[] }) {
  const p1 = results.find((r) => r.position === "1");
  const p2 = results.find((r) => r.position === "2");
  const p3 = results.find((r) => r.position === "3");

  const fastest = results.find(
    (r) => r.FastestLap?.rank === "1" && r.FastestLap?.Time?.time
  );

  const totalLaps = p1?.laps ?? results[0]?.laps ?? "-";

  const dnfCount = results.filter((r) => isDNFStatus(r.status)).length;
  const classifiedCount = results.length - dnfCount;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: "1rem",
        margin: "1rem 0",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Summary</h2>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div>
          <strong>Podium:</strong>{" "}
          {p1 ? `P1 ${displayDriver(p1)}` : "P1 -"}{" "}
          {p2 ? ` • P2 ${displayDriver(p2)}` : ""}{" "}
          {p3 ? ` • P3 ${displayDriver(p3)}` : ""}
        </div>

        <div>
          <strong>Fastest lap:</strong>{" "}
          {fastest
            ? `${displayDriver(fastest)} — ${fastest.FastestLap!.Time!.time}`
            : "-"}
        </div>

        <div>
          <strong>Total laps:</strong> {totalLaps}
        </div>

        <div>
          <strong>Classified:</strong> {classifiedCount} / {results.length}{" "}
          {dnfCount > 0 ? ` • DNF: ${dnfCount}` : ""}
        </div>
      </div>
    </div>
  );
}
