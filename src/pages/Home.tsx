import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSeasonRaces, raceStartLocal } from "../api/f1";
import type { JolpicaRace } from "../types/f1";
import TrackMap from "../components/TrackMap";
import "../App.css";

function formatLocal(dt: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

function clamp0(n: number) {
  return n < 0 ? 0 : n;
}

function countdownParts(targetMs: number, nowMs: number) {
  let diff = clamp0(targetMs - nowMs);

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minMs = 60 * 1000;

  const days = Math.floor(diff / dayMs);
  diff -= days * dayMs;

  const hours = Math.floor(diff / hourMs);
  diff -= hours * hourMs;

  const mins = Math.floor(diff / minMs);

  return { days, hours, mins };
}

export default function Home() {
  const nowYear = new Date().getFullYear();

  const [nextRace, setNextRace] = useState<JolpicaRace | null>(null);
  const [loading, setLoading] = useState(true);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const yearsToCheck = [nowYear, nowYear + 1];
        const all = await Promise.all(yearsToCheck.map((y) => getSeasonRaces(y)));
        const races = all.flat();

        const upcoming = races
          .map((r) => ({ r, t: raceStartLocal(r).getTime() }))
          .filter((x) => x.t > Date.now())
          .sort((a, b) => a.t - b.t)[0];

        if (!cancelled) setNextRace(upcoming?.r ?? null);
      } catch {
        if (!cancelled) setNextRace(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [nowYear]);

  const nextRaceTime = useMemo(() => {
    if (!nextRace) return null;
    return raceStartLocal(nextRace);
  }, [nextRace]);

  const countdown = useMemo(() => {
    if (!nextRaceTime) return null;
    return countdownParts(nextRaceTime.getTime(), nowMs);
  }, [nextRaceTime, nowMs]);

  const yearForStandings = nextRace?.season ? Number(nextRace.season) : nowYear;

  return (
    <div className="container">
      <div className="homeHeroGrid">
        <div className="homeLeft">
          <div className="homeKicker">F1Tracker</div>

          <h1 className="homeTitle">Formula One Tracker By Carter Blackie</h1>

          <div className="homeSub">
            Welcome to F1Tracker, your go-to source for Formula 1 season
          </div>

          <div className="homeGrid homeGridLeft">
            <Link className="homeCard" to="/season">
              <div className="homeCardTop">
                <span className="badge">Calendar</span>
              </div>
              <div className="homeCardTitle">Season</div>
              <div className="homeCardMeta">Upcoming and completed race cards.</div>
            </Link>

            <Link className="homeCard" to={`/standings/${yearForStandings}`}>
              <div className="homeCardTop">
                <span className="badge">Tables</span>
              </div>
              <div className="homeCardTitle">Standings</div>
              <div className="homeCardMeta">Drivers and constructors standings.</div>
            </Link>

            <Link className="homeCard" to="/live">
              <div className="homeCardTop">
                <span className="badge">Map</span>
                <span className="badge" style={{ marginLeft: "auto" }}>Paused</span>
              </div>
              <div className="homeCardTitle">Live</div>
              <div className="homeCardMeta">Watch Each Race Live.</div>
            </Link>
          </div>
        </div>

        <div className="homeNext homeNextBig">
          <div className="homeNextTop">
            <span className="badge">Next race</span>
            {nextRace ? <span className="badge">{nextRace.season}</span> : null}
          </div>

          {loading ? (
            <div className="small" style={{ marginTop: 10 }}>Loading…</div>
          ) : nextRace && nextRaceTime && countdown ? (
            <>
              <div className="homeNextTitle">{nextRace.raceName}</div>
              <div className="homeNextMeta">{nextRace.Circuit.circuitName}</div>
              <div className="homeNextMeta">
                {nextRace.Circuit.Location.locality}, {nextRace.Circuit.Location.country}
              </div>
              <div className="homeNextMeta">{formatLocal(nextRaceTime)}</div>

              <div className="homeCountdown">
                <div className="homeCountBox">
                  <div className="homeCountNum">{countdown.days}</div>
                  <div className="homeCountLbl">days</div>
                </div>
                <div className="homeCountBox">
                  <div className="homeCountNum">{countdown.hours}</div>
                  <div className="homeCountLbl">hours</div>
                </div>
                <div className="homeCountBox">
                  <div className="homeCountNum">{countdown.mins}</div>
                  <div className="homeCountLbl">mins</div>
                </div>
              </div>

              <div className="homeMiniMap homeMiniMapBig">
                <TrackMap
                  circuitId={nextRace.Circuit.circuitId}
                  variant="embedded"
                  height={300}
                />
              </div>

              <div className="pillRow" style={{ marginTop: 14 }}>
                <Link
                  className="pill pillActive"
                  to={`/race/${nextRace.season}/${nextRace.round}`}
                >
                  Open race
                </Link>
              </div>
            </>
          ) : (
            <div className="small" style={{ marginTop: 10 }}>
              No upcoming races found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
