import React, { useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import { LISTA_ESTADOS, ESTADOS } from "../consts/reparation-states.js";

export default function ReparacionCard({ reparacion, onStatusChange, onDelete }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectChange = async (e) => {
    const nuevoEstado = e.target.value;
    if (nuevoEstado === reparacion.estado) return;

    try {
      setIsUpdating(true);
      await onStatusChange(reparacion.id, nuevoEstado);
    } finally {
      setIsUpdating(false);
    }
  };

  // Botón de acción rápida para avanzar al siguiente estado lógico
  const getNextStatusAction = () => {
    if (reparacion.estado === ESTADOS.PENDIENTE) {
      return {
        next: ESTADOS.EN_REPARACION,
        label: "Iniciar reparación 🔧"
      };
    }
    if (reparacion.estado === ESTADOS.EN_REPARACION) {
      return {
        next: ESTADOS.TERMINADA,
        label: "Marcar terminada ✅"
      };
    }
    return null;
  };

  const nextAction = getNextStatusAction();

  return (
    <article className="order-card">
      <div className="order-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="order-id-badge">#{reparacion.id}</span>
          <span className="client-tag" title={reparacion.nombre_cliente ? `Cliente: ${reparacion.nombre_cliente}` : undefined}>
            👤 {reparacion.codigo_cliente}
          </span>
        </div>
        <StatusBadge estado={reparacion.estado} />
      </div>

      <div className="bike-title">
        <span>🚲</span>
        <span>{reparacion.descripcion_bici}</span>
      </div>

      <div className="problem-box">
        <div className="problem-label">Avería reportada</div>
        <div>{reparacion.problema}</div>
      </div>

      {reparacion.nombre_cliente && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <strong>Contacto:</strong> {reparacion.nombre_cliente} {reparacion.telefono_cliente ? `(${reparacion.telefono_cliente})` : ""}
        </div>
      )}

      <div className="order-card-footer">
        <div className="order-meta">
          <span>📅 {reparacion.fecha_creacion?.split(" ")[0] || "Hoy"}</span>
          {onDelete && (
            <button
              onClick={() => onDelete(reparacion.id)}
              className="btn btn-sm btn-secondary"
              style={{ color: "var(--danger-text)", borderColor: "transparent", padding: "0.2rem 0.4rem" }}
              title="Eliminar orden"
            >
              🗑️
            </button>
          )}
        </div>

        {nextAction && (
          <button
            onClick={() => onStatusChange(reparacion.id, nextAction.next)}
            disabled={isUpdating}
            className="btn btn-primary btn-sm"
            style={{ width: "100%" }}
          >
            {isUpdating ? "Actualizando..." : nextAction.label}
          </button>
        )}

        <div className="status-change-control">
          <label htmlFor={`status-${reparacion.id}`} style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Estado:
          </label>
          <select
            id={`status-${reparacion.id}`}
            value={reparacion.estado}
            onChange={handleSelectChange}
            disabled={isUpdating}
            className="status-select"
          >
            {LISTA_ESTADOS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>
    </article>
  );
}
