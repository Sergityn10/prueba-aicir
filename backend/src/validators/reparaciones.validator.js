export const ESTADOS_VALIDOS = ["Pendiente", "En reparación", "Terminada"];

/**
 * Valida los datos requeridos para la creación de una orden de reparación.
 * Retorna un objeto { isValid: boolean, errors: string[], sanitized: object }
 */
export function validateCreateReparacion(data) {
  const errors = [];
  const sanitized = {};

  // 1. Código de cliente
  if (!data.codigo_cliente || typeof data.codigo_cliente !== "string" || data.codigo_cliente.trim().length === 0) {
    errors.push("El código ficticio de cliente (codigo_cliente) es obligatorio.");
  } else {
    sanitized.codigo_cliente = data.codigo_cliente.trim().toUpperCase();
  }

  // 2. Descripción de la bicicleta
  if (!data.descripcion_bici || typeof data.descripcion_bici !== "string" || data.descripcion_bici.trim().length === 0) {
    errors.push("La descripción de la bicicleta (descripcion_bici) es obligatoria.");
  } else {
    sanitized.descripcion_bici = data.descripcion_bici.trim();
  }

  // 3. Problema comunicado
  if (!data.problema || typeof data.problema !== "string" || data.problema.trim().length === 0) {
    errors.push("El problema comunicado (problema) es obligatorio.");
  } else {
    sanitized.problema = data.problema.trim();
  }

  // 4. Estado (opcional en creación; por defecto 'Pendiente')
  if (data.estado !== undefined && data.estado !== null && data.estado !== "") {
    if (!ESTADOS_VALIDOS.includes(data.estado)) {
      errors.push(`El estado proporcionado no es válido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`);
    } else {
      sanitized.estado = data.estado;
    }
  } else {
    sanitized.estado = "Pendiente";
  }

  // 5. Campos opcionales para mayor fidelidad en taller
  sanitized.nombre_cliente = data.nombre_cliente ? String(data.nombre_cliente).trim() : null;
  sanitized.telefono_cliente = data.telefono_cliente ? String(data.telefono_cliente).trim() : null;

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Valida el cambio de estado de una orden.
 */
export function validateUpdateEstado(estado) {
  const errors = [];

  if (!estado || typeof estado !== "string" || !ESTADOS_VALIDOS.includes(estado.trim())) {
    errors.push(`El nuevo estado es inválido. Valores aceptados: ${ESTADOS_VALIDOS.join(", ")}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedEstado: estado ? estado.trim() : null
  };
}

/**
 * Valida que un ID sea un entero positivo.
 */
export function validateId(id) {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || String(parsed) !== String(id).trim()) {
    return { isValid: false, id: null };
  }
  return { isValid: true, id: parsed };
}

/**
 * Valida y normaliza parámetros de paginación para evitar sobrecarga del servidor.
 */
export function validatePagination(query = {}, defaultLimit = 6, maxLimit = 50) {
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
