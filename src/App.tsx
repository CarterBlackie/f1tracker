import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Season from "./pages/Season";
import Live from "./pages/Live";
import Race from "./pages/Race";
import Driver from "./pages/Driver";
import Team from "./pages/Team";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/season" element={<Season />} />
      <Route path="/race/:year/:round" element={<Race />} />
      <Route path="/driver/:year/:driverId" element={<Driver />} />
      <Route path="/team/:year/:constructorId" element={<Team />} />
      <Route path="/live" element={<Live />} />
    </Routes>
  );
}
