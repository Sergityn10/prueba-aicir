import React from "react";
import { ESTADO_METADATA, ESTADOS } from "../consts/reparation-states.js";

export default function StatusBadge({ estado }) {
  const meta = ESTADO_METADATA[estado] || {
    label: estado,
    className: "badge-pendiente",
    icon: "📌"
  };

  return (
    <span className={`status-badge ${meta.className}`}>
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}
