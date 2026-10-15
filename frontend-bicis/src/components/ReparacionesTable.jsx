import React from "react";
import StatusBadge from "./StatusBadge.jsx";
import { LISTA_ESTADOS } from "../consts/reparation-states.js";

export default function ReparacionesTable({ reparaciones, onStatusChange, onDelete }) {
  if (reparaciones.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No se encontraron órdenes de reparación</div>
          <p className="empty-desc">Prueba a cambiar el filtro o el término de búsqueda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Bicicleta</th>
            <th>Problema</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Cambiar Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reparaciones.map((rep) => (
            <tr key={rep.id}>
              <td>
                <span className="order-id-badge">#{rep.id}</span>
              </td>
              <td>
                <span className="client-tag">👤 {rep.codigo_cliente}</span>
                {rep.nombre_cliente && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {rep.nombre_cliente}
                  </div>
                )}
              </td>
              <td>
                <strong style={{ color: "var(--text-main)" }}>🚲 {rep.descripcion_bici}</strong>
              </td>
              <td>
                <div style={{ maxWidth: "260px", color: "var(--text-muted)" }}>
                  {rep.problema}
                </div>
              </td>
              <td>
                <StatusBadge estado={rep.estado} />
              </td>
              <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                {rep.fecha_creacion?.split(" ")[0] || "Hoy"}
              </td>
              <td>
                <select
                  value={rep.estado}
                  onChange={(e) => onStatusChange(rep.id, e.target.value)}
                  className="status-select"
                  style={{ minWidth: "140px" }}
                >
                  {LISTA_ESTADOS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                {onDelete && (
                  <button
                    onClick={() => onDelete(rep.id)}
                    className="btn btn-sm btn-secondary"
                    style={{ color: "var(--danger-text)", borderColor: "transparent" }}
                    title="Eliminar orden"
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
