import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>F1 Live Tracker</h1>
      <ul>
        <li><Link to="/season">Season</Link></li>
        <li><Link to="/live">Live</Link></li>
      </ul>
    </div>
  );
}
