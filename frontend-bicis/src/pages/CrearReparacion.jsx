import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createReparacion, getClientes } from "../api/reparaciones.js";
import { LISTA_ESTADOS, ESTADOS } from "../consts/reparation-states.js";

const AVERIAS_PREDEFINIDAS = [
  { id: "pinchazo", label: "Rueda pinchada 🛞", desc: "Pinchazo en cámara/cubierta y pérdida de presión" },
  { id: "frenos", label: "Frenos defectuosos 🛑", desc: "Zapatas/pastillas desgastadas, rozan o falta de líquido" },
  { id: "cambios", label: "Cambios desajustados ⚙️", desc: "Cadena salta de piñones o no entran los platos" },
  { id: "cadena", label: "Cadena desgastada / rota 🔗", desc: "Cadena elongada o eslabón partido, requiere cambio" },
  { id: "direccion", label: "Holgura en dirección 🧭", desc: "Manillar desviado o juego en rodamientos de dirección" },
  { id: "centrado", label: "Centrado de rueda ⭕", desc: "Llanta descentrada o radios flojos" },
  { id: "mantenimiento", label: "Revisión general 🧼", desc: "Limpieza, engrase de transmisión y ajuste de seguridad" }
];

export default function CrearReparacion() {
  const navigate = useNavigate();

  // Estados del cliente con paginación
  const [clientesList, setClientesList] = useState([]);
  const [clientPagination, setClientPagination] = useState({ page: 1, limit: 4, total: 0, totalPages: 1 });
  const [clientPage, setClientPage] = useState(1);
  const [searchClientQuery, setSearchClientQuery] = useState("");
  const [clientMode, setClientMode] = useState("search"); // "search" | "new"
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Estados del formulario general
  const [formData, setFormData] = useState({
    codigo_cliente: "",
    nombre_cliente: "",
    telefono_cliente: "",
    descripcion_bici: "",
    tipo_bici: "Montaña (MTB)",
    problema: "",
    estado: ESTADOS.PENDIENTE
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Cargar clientes paginados desde el backend para evitar saturación
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingClients(true);
    getClientes({ search: searchClientQuery, page: clientPage, limit: 4 })
      .then((res) => {
        if (!isCancelled) {
          setClientesList(res.data);
          setClientPagination(res.pagination);
        }
      })
      .catch((err) => {
        console.error("Error al cargar clientes:", err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingClients(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [searchClientQuery, clientPage]);

  // Seleccionar un cliente existente de la lista
  const handleSelectExistingClient = (cliente) => {
    setSelectedClient(cliente);
    setFormData((prev) => ({
      ...prev,
      codigo_cliente: cliente.codigo_cliente,
      nombre_cliente: cliente.nombre_cliente || "",
      telefono_cliente: cliente.telefono_cliente || ""
    }));
    if (errors.codigo_cliente) {
      setErrors((prev) => ({ ...prev, codigo_cliente: null }));
    }
  };

  // Quitar el cliente seleccionado para buscar otro o escribir uno nuevo
  const handleClearSelectedClient = () => {
    setSelectedClient(null);
    setFormData((prev) => ({
      ...prev,
      codigo_cliente: "",
      nombre_cliente: "",
      telefono_cliente: ""
    }));
  };

  // Pasar al modo de creación rápida de nuevo cliente
  const handleSwitchToNewClient = () => {
    setSelectedClient(null);
    setClientMode("new");

    // Si la búsqueda parece un código (empieza por CLI o mayúsculas), lo aprovechamos
    if (searchClientQuery.trim().toUpperCase().startsWith("CLI-")) {
      setFormData((prev) => ({ ...prev, codigo_cliente: searchClientQuery.trim().toUpperCase() }));
    } else if (searchClientQuery.trim()) {
      setFormData((prev) => ({ ...prev, nombre_cliente: searchClientQuery.trim() }));
    }
  };

  // Generador de código ficticio de cliente sugerido para agilizar la toma en mostrador
  const generarCodigoCliente = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const codigo = `CLI-${randomNum}`;
    setFormData((prev) => ({ ...prev, codigo_cliente: codigo }));
    if (errors.codigo_cliente) {
      setErrors((prev) => ({ ...prev, codigo_cliente: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Click en chip de avería habitual
  const handleSelectAveria = (averia) => {
    setFormData((prev) => {
      const nuevoProblema = prev.problema.trim()
        ? `${prev.problema.trim()}. ${averia.desc}`
        : averia.desc;
      return { ...prev, problema: nuevoProblema };
    });
    if (errors.problema) {
      setErrors((prev) => ({ ...prev, problema: null }));
    }
  };

  // Validación defensiva en frontend (cuidado del dato antes del envío)
  const validateForm = () => {
    const newErrors = {};

    if (!formData.codigo_cliente.trim()) {
      newErrors.codigo_cliente = "El código de cliente es obligatorio (ej. CLI-101).";
    }

    if (!formData.descripcion_bici.trim()) {
      newErrors.descripcion_bici = "Indica al menos la marca y modelo de la bicicleta.";
    }

    if (!formData.problema.trim()) {
      newErrors.problema = "Describe el problema o motivo de la reparación.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createReparacion({
        codigo_cliente: formData.codigo_cliente,
        nombre_cliente: formData.nombre_cliente,
        telefono_cliente: formData.telefono_cliente,
        descripcion_bici: `${formData.descripcion_bici} (${formData.tipo_bici})`,
        problema: formData.problema,
        estado: formData.estado
      });

      // Redirigir al tablero con éxito
      navigate("/");
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Error al registrar la orden de reparación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-layout">
      <header className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h2>Nueva Orden de Reparación</h2>
          <p>Registra la entrada de una bicicleta al taller con sus datos y diagnóstico.</p>
        </div>
        <Link to="/" className="btn btn-secondary">
          ← Volver al Tablero
        </Link>
      </header>

      {serverError && (
        <div className="card" style={{ backgroundColor: "var(--danger-bg)", borderColor: "var(--danger-border)", marginBottom: "1.5rem", padding: "1rem" }}>
          <p style={{ color: "var(--danger-text)", fontWeight: 600 }}>⚠️ {serverError}</p>
        </div>
      )}

      {/* Banner de Privacidad y Buenas Prácticas de Datos */}
      <div className="card" style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", marginBottom: "1.5rem", padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#1e40af", fontWeight: 600, fontSize: "0.875rem" }}>
          <span>🔒</span>
          <span>Aviso de Privacidad y Uso de IA: Datos estrictamente simulados</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#1e3a8a", marginTop: "0.25rem" }}>
          Para proteger la privacidad (RGPD), utiliza únicamente códigos de cliente ficticios o datos inventados. No introduzcas nombres ni teléfonos reales.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Sección 1: Selección / Búsqueda o Alta de Cliente */}
        <section className="form-section">
          <div className="section-title">
            <span>👤</span>
            <span>Datos del Cliente</span>
          </div>
          <p className="section-desc">
            Busca si el cliente ya está registrado en el taller o crea uno nuevo en esta misma pantalla.
          </p>

          {/* Tarjeta de cliente seleccionado si ya se eligió */}
          {selectedClient ? (
            <div className="client-selected-card">
              <div className="client-selected-info">
                <div className="client-selected-badge">
                  <span>✅ Cliente asignado:</span>
                  <span className="client-tag">👤 {selectedClient.codigo_cliente}</span>
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-main)", marginTop: "2px" }}>
                  <strong>{selectedClient.nombre_cliente}</strong>
                  {selectedClient.telefono_cliente && ` · 📞 ${selectedClient.telefono_cliente}`}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedClient}
                className="btn btn-secondary btn-sm"
              >
                🔄 Cambiar / Buscar otro
              </button>
            </div>
          ) : (
            <div>
              {/* Pestañas para alternar entre Buscar y Crear Nuevo */}
              <div className="client-mode-tabs">
                <button
                  type="button"
                  className={`client-tab-btn ${clientMode === "search" ? "active" : ""}`}
                  onClick={() => setClientMode("search")}
                >
                  <span>🔍</span>
                  <span>Buscar cliente existente</span>
                </button>
                <button
                  type="button"
                  className={`client-tab-btn ${clientMode === "new" ? "active" : ""}`}
                  onClick={() => setClientMode("new")}
                >
                  <span>➕</span>
                  <span>Crear nuevo cliente</span>
                </button>
              </div>

              {/* Modo 1: Búsqueda interactiva de cliente existente */}
              {clientMode === "search" && (
                <div>
                  <div className="search-box" style={{ maxWidth: "100%", marginBottom: "0.75rem" }}>
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Escribe código (ej: CLI-001), nombre o teléfono para buscar..."
                      value={searchClientQuery}
                      onChange={(e) => {
                        setSearchClientQuery(e.target.value);
                        setClientPage(1);
                      }}
                    />
                  </div>

                  {isLoadingClients ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "0.5rem" }}>
                      Cargando clientes...
                    </p>
                  ) : clientesList.length > 0 ? (
                    <div>
                      <div className="client-search-results">
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0.25rem 0.5rem" }}>
                          Clientes encontrados ({clientPagination.total} en total):
                        </div>
                        {clientesList.map((cliente) => (
                          <div key={cliente.id} className="client-result-item">
                            <div>
                              <span className="client-tag" style={{ marginRight: "0.5rem" }}>
                                {cliente.codigo_cliente}
                              </span>
                              <strong style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                                {cliente.nombre_cliente}
                              </strong>
                              {cliente.telefono_cliente && (
                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                  ({cliente.telefono_cliente})
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectExistingClient(cliente)}
                              className="btn btn-primary btn-sm"
                            >
                              Seleccionar ✓
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Paginación de clientes para no saturar */}
                      {clientPagination.totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <span>
                            Página {clientPagination.page} de {clientPagination.totalPages}
                          </span>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button
                              type="button"
                              className="page-btn"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                              disabled={clientPage <= 1}
                              onClick={() => setClientPage((prev) => prev - 1)}
                            >
                              ◀ Anterior
                            </button>
                            <button
                              type="button"
                              className="page-btn"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                              disabled={clientPage >= clientPagination.totalPages}
                              onClick={() => setClientPage((prev) => prev + 1)}
                            >
                              Siguiente ▶
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="client-empty-prompt">
                      <p style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 600 }}>
                        No se encontró ningún cliente con "{searchClientQuery}"
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.35rem 0 0.85rem" }}>
                        Puedes dar de alta a este cliente ahora mismo en esta pantalla.
                      </p>
                      <button
                        type="button"
                        onClick={handleSwitchToNewClient}
                        className="btn btn-primary btn-sm"
                      >
                        ➕ Crear nuevo cliente ahora
                      </button>
                    </div>
                  )}

                  {errors.codigo_cliente && (
                    <p className="field-error" style={{ marginTop: "0.5rem" }}>
                      {errors.codigo_cliente}
                    </p>
                  )}
                </div>
              )}

              {/* Modo 2: Creación de nuevo cliente en la misma pantalla */}
              {clientMode === "new" && (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="codigo_cliente" className="form-label">
                        Código de Cliente <span className="required">*</span>
                      </label>
                      <div className="input-with-action">
                        <input
                          type="text"
                          id="codigo_cliente"
                          name="codigo_cliente"
                          placeholder="Ej: CLI-101"
                          value={formData.codigo_cliente}
                          onChange={handleChange}
                          className={`form-input ${errors.codigo_cliente ? "has-error" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={generarCodigoCliente}
                          className="btn btn-secondary btn-sm"
                          title="Generar código sugerido aleatorio"
                        >
                          ⚡ Sugerir
                        </button>
                      </div>
                      {errors.codigo_cliente && <span className="field-error">{errors.codigo_cliente}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="nombre_cliente" className="form-label">
                        Nombre Ficticio del Cliente <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="nombre_cliente"
                        name="nombre_cliente"
                        placeholder="Ej: Cliente Ficticio A"
                        value={formData.nombre_cliente}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="telefono_cliente" className="form-label">
                        Teléfono Ficticio (Prefijo 555)
                      </label>
                      <input
                        type="tel"
                        id="telefono_cliente"
                        name="telefono_cliente"
                        placeholder="Ej: 555-010099"
                        value={formData.telefono_cliente}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => setClientMode("search")}
                      className="btn btn-secondary btn-sm"
                    >
                      ← Volver al buscador de clientes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sección 2: Información de la Bicicleta */}
        <section className="form-section">
          <div className="section-title">
            <span>🚲</span>
            <span>Descripción de la Bicicleta</span>
          </div>
          <p className="section-desc">Marca, modelo, tipo y detalles estéticos para identificarla en el taller.</p>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="descripcion_bici" className="form-label">
                Marca y Modelo <span className="required">*</span>
              </label>
              <input
                type="text"
                id="descripcion_bici"
                name="descripcion_bici"
                placeholder="Ej: Orbea Oiz H30 - Color Verde militar"
                value={formData.descripcion_bici}
                onChange={handleChange}
                className={`form-input ${errors.descripcion_bici ? "has-error" : ""}`}
              />
              {errors.descripcion_bici && <span className="field-error">{errors.descripcion_bici}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="tipo_bici" className="form-label">
                Modalidad / Tipo
              </label>
              <select
                id="tipo_bici"
                name="tipo_bici"
                value={formData.tipo_bici}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Montaña (MTB)">Montaña (MTB)</option>
                <option value="Carretera">Carretera</option>
                <option value="Gravel">Gravel</option>
                <option value="Urbana / Paseo">Urbana / Paseo</option>
                <option value="Plegable">Plegable</option>
                <option value="Eléctrica (E-Bike)">Eléctrica (E-Bike)</option>
                <option value="Infantil">Infantil</option>
              </select>
            </div>
          </div>
        </section>

        {/* Sección 3: Problema Comunicado */}
        <section className="form-section">
          <div className="section-title">
            <span>🔧</span>
            <span>Problema Comunicado y Diagnóstico</span>
          </div>
          <p className="section-desc">
            Averías frecuentes (haz clic para rellenar rápido) o escribe el problema comunicado por el cliente.
          </p>

          <div className="preset-chips">
            {AVERIAS_PREDEFINIDAS.map((averia) => (
              <button
                type="button"
                key={averia.id}
                onClick={() => handleSelectAveria(averia)}
                className="chip-btn"
                title={averia.desc}
              >
                {averia.label}
              </button>
            ))}
          </div>

          <div className="form-group full-width">
            <label htmlFor="problema" className="form-label">
              Descripción del Problema <span className="required">*</span>
            </label>
            <textarea
              id="problema"
              name="problema"
              rows={4}
              placeholder="Describe detalladamente el problema observado o los trabajos a realizar..."
              value={formData.problema}
              onChange={handleChange}
              className={`form-textarea ${errors.problema ? "has-error" : ""}`}
            />
            {errors.problema && <span className="field-error">{errors.problema}</span>}
          </div>
        </section>

        {/* Sección 4: Estado Inicial */}
        <section className="form-section">
          <div className="section-title">
            <span>🚦</span>
            <span>Estado Inicial de la Orden</span>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="estado" className="form-label">
                Estado inicial
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="form-select"
              >
                {LISTA_ESTADOS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Botones de acción */}
        <div className="form-actions">
          <Link to="/" className="btn btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ minWidth: "160px" }}
          >
            {isSubmitting ? "Registrando orden..." : "Guardar Orden de Reparación"}
          </button>
        </div>
      </form>
    </div>
  );
}
