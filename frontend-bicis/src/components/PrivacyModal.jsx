import React from "react";

export default function PrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "680px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "2rem"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)" }}>
              🔒 Privacidad, Uso de IA y Gestión de Clientes
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Criterio técnico de protección de datos (RGPD) para el taller de bicicletas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "var(--text-muted)"
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "0.9rem", color: "var(--text-main)", lineHeight: 1.6 }}>
          {/* 1. Datos Ficticios */}
          <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid var(--primary)" }}>
            <h4 style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--primary-text)" }}>
              1. Principio de Datos Sintéticos y Minimización
            </h4>
            <p style={{ fontSize: "0.85rem" }}>
              En este prototipo se utilizan <strong>exclusivamente datos inventados</strong>. Los clientes se identifican por códigos ficticios (<code>CLI-001</code>) y los teléfonos utilizan el rango reservado para ficción (<code>555-XXXXXX</code>), sin recopilar información personal identificable (PII) real.
            </p>
          </div>

          {/* 2. Cómo relacionaríamos clientes y reparaciones */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>🗄️</span>
              <span>2. ¿Cómo relacionar las reparaciones con sus clientes?</span>
            </h4>
            <p style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>
              Si el producto necesitara datos reales de contacto (notificaciones SMS/WhatsApp de bici terminada, presupuestos o facturas), la arquitectura debe aplicar <strong>disociación de datos (pseudonimización)</strong> mediante un modelo relacional 1:N:
            </p>
            <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "0.75rem 1rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.8rem" }}>
              TABLA clientes (id, codigo_cliente, nombre, telefono, email, consentimientos_rgpd, fecha_alta)<br />
              &nbsp;&nbsp;└── 1 : N ──&gt; TABLA reparaciones (id, cliente_id, descripcion_bici, problema, estado)
            </div>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              La orden de reparación en el taller solo almacena la clave foránea <code>cliente_id</code>. De este modo, la ficha de trabajo técnico viaja por el taller sin exponer datos privados en papel ni en pantallas compartidas.
            </p>
          </div>

          {/* 3. Quién debería tener acceso (RBAC) */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>👥</span>
              <span>3. Control de Acceso por Roles (RBAC): ¿Quién debe acceder?</span>
            </h4>
            <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li>
                <strong>👨‍🔧 Mecánico / Personal de Taller:</strong> Solo acceso técnico a la bicicleta, piezas y averías (<code>descripcion_bici</code>, <code>problema</code>, <code>estado</code>). <em>No tiene acceso</em> al teléfono ni email del cliente para evitar exposición innecesaria de PII.
              </li>
              <li>
                <strong>💼 Recepción y Atención al Cliente:</strong> Acceso a los datos de contacto para avisar al cliente cuando la orden pase a estado <em>«Terminada»</em>, validar el presupuesto o enviar la factura.
              </li>
              <li>
                <strong>🛡️ Administrador del Sistema / DPO:</strong> Gestión global, logs de auditoría de accesos a datos personales y cumplimiento de derechos ARCO/RGPD (acceso, rectificación, supresión y limitación del tratamiento).
              </li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn btn-primary">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
