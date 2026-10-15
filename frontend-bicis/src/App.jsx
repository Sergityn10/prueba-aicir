import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import SideBar from "./components/SideBar.jsx";
import CrearReparacion from "./pages/CrearReparacion.jsx";

function App() {
  return (
    <div className="app-layout">
      <SideBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<CrearReparacion />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
