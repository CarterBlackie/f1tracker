import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSeasonRaces, raceStartLocal } from "../api/f1";
import type { JolpicaRace } from "../types/f1";

function formatLocal(dt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export default function Home() {
  const [nextRace, setNextRace] = useState<JolpicaRace | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const year = new Date().getFullYear();
      const races = await getSeasonRaces(year);
      const now = Date.now();

      const upcoming = races
        .map((r) => ({ r, t: raceStartLocal(r).getTime() }))
        .filter((x) => x.t > now)
        .sort((a, b) => a.t - b.t)[0];

      if (!cancelled) setNextRace(upcoming?.r ?? null);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>F1 Live Tracker</h1>

      {nextRace ? (
        <div style={{ border: "1px solid #ccc", padding: "1rem", maxWidth: 420 }}>
          <h3>Next Race</h3>
          <strong>{nextRace.raceName}</strong>
          <div>
            {nextRace.Circuit.Location.locality},{" "}
            {nextRace.Circuit.Location.country}
          </div>
          <div>{formatLocal(raceStartLocal(nextRace))}</div>
          <Link to={`/race/${nextRace.season}/${nextRace.round}`}>
            View race
          </Link>
        </div>
      ) : (
        <p>No upcoming races.</p>
      )}

      <hr />
      <ul>
        <li><Link to="/season">Season</Link></li>
        <li><Link to="/live">Live</Link></li>
        <li><Link to="/standings">Standings</Link></li>
      </ul>
    </div>
  );
}
