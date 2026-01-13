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

type SectionId = "hero" | "nav" | "next";

function prefersReducedMotion(): boolean {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  // Load next race
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

  // Active section for theme transitions + dot highlighting
  const [activeSection, setActiveSection] = useState<SectionId>("hero");

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".scrollRoot");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
    if (!scroller || sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (visible?.target) {
          const id = (visible.target as HTMLElement).dataset.section as SectionId | undefined;
          if (id) setActiveSection(id);
        }

        // Add/remove active class for per-section background transitions
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) el.classList.add("isActive");
          else el.classList.remove("isActive");
        });
      },
      { root: scroller, threshold: [0.25, 0.4, 0.55] }
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const scrollTo = (id: SectionId) => {
    const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
    const scroller = document.querySelector<HTMLElement>(".scrollRoot");
    if (!el || !scroller) return;
    scroller.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  // Reveal animation (fade up) for anything with data-reveal
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".scrollRoot");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!scroller || els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add("in");
        });
      },
      { root: scroller, threshold: 0.22 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Tilt + parallax glow on feature cards
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const cards = Array.from(document.querySelectorAll<HTMLElement>(".featureCardLarge"));
    if (cards.length === 0) return;

    let raf = 0;

    const onMove = (card: HTMLElement, ev: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width; // 0..1
      const py = (ev.clientY - rect.top) / rect.height; // 0..1

      const dx = px - 0.5; // -0.5..0.5
      const dy = py - 0.5;

      // Tilt amount (degrees)
      const rx = (-dy * 8).toFixed(3);
      const ry = (dx * 10).toFixed(3);

      // Glow position
      const mx = (px * 100).toFixed(2) + "%";
      const my = (py * 100).toFixed(2) + "%";

      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.style.setProperty("--mx", mx);
      card.style.setProperty("--my", my);
    };

    const attach = (card: HTMLElement) => {
      const handleMove = (ev: MouseEvent) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => onMove(card, ev));
      };

      const handleLeave = () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "35%");
      };

      card.addEventListener("mousemove", handleMove);
      card.addEventListener("mouseleave", handleLeave);

      // init
      handleLeave();

      return () => {
        card.removeEventListener("mousemove", handleMove);
        card.removeEventListener("mouseleave", handleLeave);
      };
    };

    const cleanups = cards.map(attach);
    return () => {
      cleanups.forEach((fn) => fn());
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={`scrollRoot theme-${activeSection}`}>
      {/* Progress dots */}
      <div className="progressDots" aria-label="Page sections">
        <button
          className={`dot ${activeSection === "hero" ? "dotActive" : ""}`}
          onClick={() => scrollTo("hero")}
          aria-label="Hero"
        />
        <button
          className={`dot ${activeSection === "nav" ? "dotActive" : ""}`}
          onClick={() => scrollTo("nav")}
          aria-label="Choose a view"
        />
        <button
          className={`dot ${activeSection === "next" ? "dotActive" : ""}`}
          onClick={() => scrollTo("next")}
          aria-label="Next race"
        />
      </div>

      {/* HERO */}
      <section className="scrollSection panelHero" data-section="hero" data-reveal>
        <div className="container panelGrid">
          <div className="panelLeft">
            <span className="kicker">F1Tracker</span>

            <h1 className="panelTitle">Formula One Tracker</h1>

            <p className="panelLead">
              Follow the Formula 1 season with the calendar, standings, and a next race countdown.
            </p>

            <div className="heroActions">
              <Link className="heroBtn heroBtnPrimary" to="/season">
                Explore Season
              </Link>

              <Link className="heroBtn heroBtnSecondary" to={`/standings/${yearForStandings}`}>
                Standings
              </Link>
            </div>

            <div className="heroMini">
              <div className="miniChip">
                <div className="miniTop">Season</div>
                <div className="miniVal">{nowYear}</div>
              </div>
              <div className="miniChip">
                <div className="miniTop">Views</div>
                <div className="miniVal">3</div>
              </div>
            </div>

            <div className="scrollCueFancy" aria-hidden="true">
              <span className="scrollCueText">Scroll</span>
              <span className="scrollCueLine" />
            </div>
          </div>

          <div className="panelRight">
            <div className="glassPanel glassPanelBig">
              <div className="glassTopRow">
                <span className="badge">Highlights</span>
                <span className="badge">{nowYear}</span>
              </div>

              <div className="glassTitleBig">Everything in one place</div>
              <div className="glassMeta">
                Jump into the season, check standings, or open the next race.
              </div>

              <div className="glassRail">
                <div className="railCard">
                  <div className="railLabel">Season</div>
                  <div className="railHint">Schedule + race cards</div>
                </div>
                <div className="railCard">
                  <div className="railLabel">Standings</div>
                  <div className="railHint">Drivers + constructors</div>
                </div>
                <div className="railCard">
                  <div className="railLabel">Next Race</div>
                  <div className="railHint">Countdown + map</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHOOSE A VIEW */}
      <section className="scrollSection panelNav" data-section="nav" data-reveal>
        <div className="container">
          <div className="sectionHeadBig">
            <div className="sectionEyebrow">Choose a view</div>
            <div className="sectionTitleBig">Where do you want to go?</div>
            <div className="sectionDesc">
              Each view has a big layout and quick info. Hover a card to see more.
            </div>
          </div>

          <div className="featureGridBig">
            <Link className="featureCard featureCardLarge" to="/season">
              <div className="featureTopRow">
                <span className="badge">Calendar</span>
                <span className="pillTiny">Races</span>
              </div>

              <div className="featureIconWrap" aria-hidden="true">
                {/* Calendar icon */}
                <svg viewBox="0 0 24 24" className="featureIcon">
                  <path
                    d="M7 3v2M17 3v2M4.5 7.5h15M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M7.2 11.3h3.2M7.2 14.3h5.6M7.2 17.3h4.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="featureTitle">Season</div>
              <div className="featureMeta">Upcoming and completed race cards.</div>

              <div className="featureDesc">
                Browse every round, see results, and jump into any race detail page.
              </div>

              <div className="featureAction">Open season →</div>
            </Link>

            <Link className="featureCard featureCardLarge" to={`/standings/${yearForStandings}`}>
              <div className="featureTopRow">
                <span className="badge">Tables</span>
                <span className="pillTiny">Points</span>
              </div>

              <div className="featureIconWrap" aria-hidden="true">
                {/* Trophy icon */}
                <svg viewBox="0 0 24 24" className="featureIcon">
                  <path
                    d="M8 4h8v3a4 4 0 0 1-8 0V4Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6H4.8A1.8 1.8 0 0 0 3 7.8V9a4 4 0 0 0 4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 6h1.2A1.8 1.8 0 0 1 21 7.8V9a4 4 0 0 1-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 15h4M9 20h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="featureTitle">Standings</div>
              <div className="featureMeta">Drivers and constructors standings.</div>

              <div className="featureDesc">
                See who leads the championship and compare drivers and teams by points.
              </div>

              <div className="featureAction">Open standings →</div>
            </Link>

            <Link className="featureCard featureCardLarge" to="/live">
              <div className="featureTopRow">
                <span className="badge">Map</span>
                <span className="pillTiny">Telemetry</span>
              </div>

              <div className="featureIconWrap" aria-hidden="true">
                {/* Radar icon */}
                <svg viewBox="0 0 24 24" className="featureIcon">
                  <path
                    d="M12 21a9 9 0 1 1 9-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 12l6-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 3v9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                  <path
                    d="M3 12h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                </svg>
              </div>

              <div className="featureTitle">Live</div>
              <div className="featureMeta">Watch each race live.</div>

              <div className="featureDesc">
                Open the circuit view and follow race activity with live updates.
              </div>

              <div className="featureAction">Open live →</div>
            </Link>
          </div>
        </div>
      </section>

      {/* NEXT RACE */}
      <section className="scrollSection panelNext" data-section="next" data-reveal>
        <div className="container panelGrid">
          <div className="panelLeft">
            <div className="sectionHeadBig">
              <div className="sectionEyebrow">Countdown</div>
              <div className="sectionTitleBig">Next race</div>
              <div className="sectionDesc">Live countdown with the circuit map.</div>
            </div>

            <div className="homeNext homeNextBig">
              <div className="homeNextTop">
                <span className="badge">Next race</span>
                {nextRace ? <span className="badge">{nextRace.season}</span> : null}
              </div>

              {loading ? (
                <div className="small" style={{ marginTop: 10 }}>
                  Loading…
                </div>
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

                  <div className="pillRow" style={{ marginTop: 14 }}>
                    <Link className="pill pillActive" to={`/race/${nextRace.season}/${nextRace.round}`}>
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

          <div className="panelRight">
            <div className="mapStage">
              {nextRace ? (
                <TrackMap circuitId={nextRace.Circuit.circuitId} variant="embedded" height={380} />
              ) : (
                <div className="small">No map to show.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
