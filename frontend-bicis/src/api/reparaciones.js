const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? "http://localhost:3001/api"
    : "/api");

/**
 * Consulta la lista de reparaciones con paginación y filtros opcionales.
 */
export async function getReparaciones({ estado = "", search = "", page = 1, limit = 6 } = {}) {
  const params = new URLSearchParams();
  if (estado) params.append("estado", estado);
  if (search) params.append("search", search);
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/reparaciones${query}`);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error al obtener órdenes (${res.status})`);
  }

  const json = await res.json();
  return {
    data: json.data || [],
    pagination: json.pagination || { page: 1, limit: 6, total: (json.data || []).length, totalPages: 1 }
  };
}

/**
 * Obtiene el detalle de una orden por ID.
 */
export async function getReparacionById(id) {
  const res = await fetch(`${API_BASE}/reparaciones/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error al consultar la orden #${id}`);
  }
  const json = await res.json();
  return json.data;
}

/**
 * Crea una nueva orden de reparación.
 */
export async function createReparacion(data) {
  const res = await fetch(`${API_BASE}/reparaciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.errors ? json.errors.join(" ") : json.message || "Error al crear orden";
    throw new Error(errorMsg);
  }

  return json.data;
}

/**
 * Actualiza el estado de una reparación ('Pendiente' | 'En reparación' | 'Terminada').
 */
export async function updateEstadoReparacion(id, nuevoEstado) {
  const res = await fetch(`${API_BASE}/reparaciones/${id}/estado`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ estado: nuevoEstado })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.errors ? json.errors.join(" ") : json.message || "Error al actualizar estado";
    throw new Error(errorMsg);
  }

  return json.data;
}

/**
 * Obtiene estadísticas agregadas del taller para el dashboard.
 */
export async function getReparacionesStats() {
  const res = await fetch(`${API_BASE}/reparaciones/stats`);
  if (!res.ok) {
    throw new Error("Error al obtener estadísticas del taller");
  }
  const json = await res.json();
  return json.data;
}

/**
 * Elimina una orden (opcional para pruebas).
 */
export async function deleteReparacion(id) {
  const res = await fetch(`${API_BASE}/reparaciones/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Error al eliminar orden");
  }
  return true;
}

/**
 * Consulta la lista de clientes del taller con paginación y búsqueda opcional.
 */
export async function getClientes({ search = "", page = 1, limit = 5 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/clientes${query}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al consultar clientes");
  }
  const json = await res.json();
  return {
    data: json.data || [],
    pagination: json.pagination || { page: 1, limit: 5, total: (json.data || []).length, totalPages: 1 }
  };
}

/**
 * Registra un nuevo cliente ficticio.
 */
export async function createCliente(clienteData) {
  const res = await fetch(`${API_BASE}/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clienteData)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || "Error al crear cliente");
  }
  return json.data;
}
