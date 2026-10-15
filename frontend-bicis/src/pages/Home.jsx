import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getReparaciones,
  updateEstadoReparacion,
  getReparacionesStats,
  deleteReparacion
} from "../api/reparaciones.js";
import KanbanBoard from "../components/KanbanBoard.jsx";
import ReparacionesTable from "../components/ReparacionesTable.jsx";
import Pagination from "../components/Pagination.jsx";
import Toast from "../components/Toast.jsx";
import { LISTA_ESTADOS } from "../consts/reparation-states.js";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados leídos de la URL (Fuente de verdad con buenas prácticas de deep-linking)
  const page = parseInt(searchParams.get("page") || "1", 10);
  const estadoFilter = searchParams.get("estado") || "";
  const searchTerm = searchParams.get("search") || "";
  const viewMode = searchParams.get("view") || "kanban"; // "kanban" | "table"

  // Estado local para input de búsqueda fluida
  const [searchInput, setSearchInput] = useState(searchTerm);

  // Estados de datos
  const [reparaciones, setReparaciones] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, pendientes: 0, en_reparacion: 0, terminadas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Notificaciones Toast
  const [toast, setToast] = useState(null);

  // Sincronizar input de búsqueda si cambia la URL externamente (ej: atrás/adelante)
  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  // Función de actualización de parámetros en la URL
  const updateUrlParams = (newParams) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === "" || v === null || v === undefined) {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      return next;
    });
  };

  // Cargar datos paginados desde el servidor
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resReparaciones, metricas] = await Promise.all([
        getReparaciones({
          estado: estadoFilter,
          search: searchTerm,
          page,
          limit: 6
        }),
        getReparacionesStats().catch(() => null)
      ]);

      setReparaciones(resReparaciones.data);
      setPagination(resReparaciones.pagination);
      if (metricas) setStats(metricas);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Efecto que escucha cambios en los query params de la URL
  useEffect(() => {
    loadData();
  }, [page, estadoFilter, searchTerm]);

  // Manejadores de interacción
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateUrlParams({ search: searchInput.trim(), page: 1 });
  };

  const handleEstadoFilterChange = (e) => {
    updateUrlParams({ estado: e.target.value, page: 1 });
  };

  const handleViewToggle = (mode) => {
    updateUrlParams({ view: mode });
  };

  const handlePageChange = (newPage) => {
    updateUrlParams({ page: newPage });
  };

  // Cambio de estado optimista con feedback
  const handleStatusChange = async (id, nuevoEstado) => {
    const previous = [...reparaciones];
    setReparaciones((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: nuevoEstado } : r))
    );

    try {
      await updateEstadoReparacion(id, nuevoEstado);
      setToast({
        type: "success",
        message: `Orden #${id} actualizada a '${nuevoEstado}' correctamente.`
      });

      // Refrescar estadísticas y datos
      getReparacionesStats().then(setStats).catch(() => {});
      loadData();
    } catch (err) {
      setReparaciones(previous);
      setToast({
        type: "error",
        message: `No se pudo cambiar el estado: ${err.message}`
      });
    }
  };

  // Eliminar orden
  const handleDelete = async (id) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la orden de reparación #${id}?`)) {
      return;
    }

    try {
      await deleteReparacion(id);
      setToast({
        type: "success",
        message: `Orden #${id} eliminada.`
      });
      loadData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.message
      });
    }
  };

  return (
    <div className="home-page">
      {/* Encabezado */}
      <header className="page-header">
        <div>
          <h2>Taller de Reparaciones</h2>
          <p>Supervisa el flujo de trabajo de las bicicletas recibidas en taller.</p>
        </div>
        <Link to="/new" className="btn btn-primary">
          <span>➕</span>
          <span>Registrar Bicicleta</span>
        </Link>
      </header>

      {/* Métricas rápidas del taller */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">🚲</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total en Taller</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pendiente">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pendientes}</div>
            <div className="stat-label">Pendientes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon reparacion">🔧</div>
          <div className="stat-info">
            <div className="stat-value">{stats.en_reparacion}</div>
            <div className="stat-label">En Reparación</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon terminada">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.terminadas}</div>
            <div className="stat-label">Terminadas</div>
          </div>
        </div>
      </section>

      {/* Barra de Controles y Filtros con Paginación en URL */}
      <section className="controls-bar">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente, bicicleta, problema o ID (pulsa Enter)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="filter-actions">
          <select
            value={estadoFilter}
            onChange={handleEstadoFilterChange}
            className="status-select"
            style={{ padding: "0.55rem 0.85rem" }}
          >
            <option value="">Todos los estados</option>
            {LISTA_ESTADOS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "kanban" ? "active" : ""}`}
              onClick={() => handleViewToggle("kanban")}
              title="Vista de columnas Kanban"
            >
              <span>📊</span>
              <span>Tablero</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => handleViewToggle("table")}
              title="Vista en tabla"
            >
              <span>📑</span>
              <span>Tabla</span>
            </button>
          </div>

          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            title="Refrescar datos"
          >
            🔄
          </button>
        </div>
      </section>

      {/* Contenido principal: Carga, Error o Vistas */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Cargando órdenes del taller...</div>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem", borderColor: "#fca5a5" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
          <h3 style={{ color: "var(--danger-text)", marginBottom: "0.5rem" }}>Error de conexión con el backend</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{error}</p>
          <button onClick={loadData} className="btn btn-primary">
            Reintentar conexión
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          reparaciones={reparaciones}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        <ReparacionesTable
          reparaciones={reparaciones}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {/* Barra de Paginación vinculada a la URL */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={handlePageChange}
      />

      {/* Feedback Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
