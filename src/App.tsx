import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Season from "./pages/Season";
import Live from "./pages/Live";
import Race from "./pages/Race";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/season" element={<Season />} />
      <Route path="/race/:year/:round" element={<Race />} />
      <Route path="/live" element={<Live />} />
    </Routes>
  );
}
