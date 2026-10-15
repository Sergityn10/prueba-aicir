import { db } from "../config/database.js";

export const ReparacionesRepository = {
  /**
   * Obtiene reparaciones paginadas, con filtros opcionales de estado y búsqueda textual.
   */
  async findAll({ estado, search, limit, offset } = {}) {
    let whereClause = " WHERE 1=1";
    const params = [];

    if (estado) {
      whereClause += " AND estado = ?";
      params.push(estado);
    }

    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      whereClause += ` AND (
        codigo_cliente LIKE ? OR 
        descripcion_bici LIKE ? OR 
        problema LIKE ? OR 
        nombre_cliente LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // 1. Conteo total para metadatos de paginación
    const countQuery = `SELECT COUNT(*) as total FROM reparaciones ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const countRow = countStmt.get(...params);
    const total = countRow.total || 0;

    // 2. Consulta de datos ordenados y acotados por LIMIT / OFFSET
    let dataQuery = `
      SELECT 
        id,
        codigo_cliente,
        nombre_cliente,
        telefono_cliente,
        descripcion_bici,
        problema,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM reparaciones
      ${whereClause}
      ORDER BY id DESC
    `;

    const dataParams = [...params];
    if (limit !== undefined && offset !== undefined) {
      dataQuery += " LIMIT ? OFFSET ?";
      dataParams.push(limit, offset);
    }

    const stmt = db.prepare(dataQuery);
    const rows = stmt.all(...dataParams);

    return { rows, total };
  },

  /**
   * Busca una orden por su ID primario.
   */
  async findById(id) {
    const stmt = db.prepare("SELECT * FROM reparaciones WHERE id = ?");
    const row = stmt.get(id);
    return row || null;
  },

  /**
   * Inserta una nueva orden de reparación.
   */
  async create(data) {
    const query = `
      INSERT INTO reparaciones (
        codigo_cliente,
        nombre_cliente,
        telefono_cliente,
        descripcion_bici,
        problema,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.codigo_cliente,
      data.nombre_cliente || null,
      data.telefono_cliente || null,
      data.descripcion_bici,
      data.problema,
      data.estado || "Pendiente"
    ];

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    return ReparacionesRepository.findById(Number(result.lastInsertRowid));
  },

  /**
   * Actualiza únicamente el estado de una reparación y su timestamp de actualización.
   */
  async updateEstado(id, nuevoEstado) {
    const query = `
      UPDATE reparaciones 
      SET 
        estado = ?,
        fecha_actualizacion = datetime('now', 'localtime')
      WHERE id = ?
    `;

    const stmt = db.prepare(query);
    const result = stmt.run(nuevoEstado, id);

    if (result.changes === 0) return null;
    return ReparacionesRepository.findById(id);
  },

  /**
   * Elimina una orden (útil para descartar pruebas).
   */
  async delete(id) {
    const stmt = db.prepare("DELETE FROM reparaciones WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Retorna estadísticas cuantitativas agrupadas para widgets del dashboard.
   */
  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'En reparación' THEN 1 ELSE 0 END) as en_reparacion,
        SUM(CASE WHEN estado = 'Terminada' THEN 1 ELSE 0 END) as terminadas
      FROM reparaciones
    `;
    const stmt = db.prepare(query);
    const row = stmt.get();

    return {
      total: row.total || 0,
      pendientes: row.pendientes || 0,
      en_reparacion: row.en_reparacion || 0,
      terminadas: row.terminadas || 0
    };
  }
};
