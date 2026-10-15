import React from "react";
import ReparacionCard from "./ReparacionCard.jsx";
import { ESTADOS, ESTADO_METADATA } from "../consts/reparation-states.js";

const COLUMNAS = [
  { estado: ESTADOS.PENDIENTE, title: "Pendientes", icon: "⏳" },
  { estado: ESTADOS.EN_REPARACION, title: "En Reparación", icon: "🔧" },
  { estado: ESTADOS.TERMINADA, title: "Terminadas", icon: "✅" }
];

export default function KanbanBoard({ reparaciones, onStatusChange, onDelete }) {
  return (
    <div className="kanban-grid">
      {COLUMNAS.map(({ estado, title, icon }) => {
        const ordenesColumna = reparaciones.filter((r) => r.estado === estado);

        return (
          <section key={estado} className="kanban-column">
            <header className="kanban-column-header">
              <div className="kanban-column-title">
                <span>{icon}</span>
                <span>{title}</span>
              </div>
              <span className="column-count">{ordenesColumna.length}</span>
            </header>

            <div className="kanban-cards-list">
              {ordenesColumna.length === 0 ? (
                <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                  <div className="empty-icon">🚲</div>
                  <p className="empty-desc">Sin bicicletas en esta etapa</p>
                </div>
              ) : (
                ordenesColumna.map((rep) => (
                  <ReparacionCard
                    key={rep.id}
                    reparacion={rep}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
