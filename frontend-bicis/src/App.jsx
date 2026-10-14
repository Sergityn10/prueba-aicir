import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import SideBar from "./components/SideBar.jsx";
import CrearReparacion from "./pages/CrearReparacion.jsx";

function App() {
  return (
    <>
      <SideBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<CrearReparacion />} />
      </Routes>
    </>
  );
}

export default App;
