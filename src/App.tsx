import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Season from "./pages/Season";
import Live from "./pages/Live";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/season" element={<Season />} />
      <Route path="/live" element={<Live />} />
    </Routes>
  );
}
