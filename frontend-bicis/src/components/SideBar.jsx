import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import PrivacyModal from "./PrivacyModal.jsx";

export default function SideBar() {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🚴</div>
          <div className="brand-text">
            <h1>BiciTaller Pro</h1>
            <span>Gestión de Reparaciones</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">📋</span>
            <span>Tablero de Órdenes</span>
          </NavLink>

          <NavLink
            to="/new"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">➕</span>
            <span>Nueva Reparación</span>
          </NavLink>

          <button
            onClick={() => setShowPrivacy(true)}
            className="nav-item"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              marginTop: "auto"
            }}
          >
            <span className="nav-icon">🔒</span>
            <span>Privacidad y RGPD</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <p><strong>aicir</strong> · PRET/TR3S60</p>
          <p style={{ marginTop: "4px" }}>Prototipo de Taller v1.0</p>
        </div>
      </aside>

      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
