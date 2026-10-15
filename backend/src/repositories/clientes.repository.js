import { db } from "../config/database.js";

export const ClientesRepository = {
  /**
   * Obtiene clientes paginados o busca por texto (código, nombre o teléfono).
   */
  async findAll({ search = "", limit, offset } = {}) {
    let whereClause = " WHERE 1=1";
    const params = [];

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      whereClause += ` AND (
        codigo_cliente LIKE ? OR
        nombre_cliente LIKE ? OR
        telefono_cliente LIKE ?
      )`;
      params.push(term, term, term);
    }

    // 1. Conteo total de clientes coincidentes
    const countQuery = `SELECT COUNT(*) as total FROM clientes ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const countRow = countStmt.get(...params);
    const total = countRow.total || 0;

    // 2. Consulta de filas acotadas
    let dataQuery = `
      SELECT id, codigo_cliente, nombre_cliente, telefono_cliente, fecha_creacion
      FROM clientes
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
   * Busca un cliente por su código único (ej: CLI-001).
   */
  async findByCodigo(codigo_cliente) {
    if (!codigo_cliente) return null;
    const stmt = db.prepare("SELECT * FROM clientes WHERE UPPER(codigo_cliente) = UPPER(?)");
    return stmt.get(codigo_cliente.trim()) || null;
  },

  /**
   * Inserta un nuevo cliente ficticio.
   */
  async create(data) {
    const query = `
      INSERT INTO clientes (codigo_cliente, nombre_cliente, telefono_cliente)
      VALUES (?, ?, ?)
    `;

    const codigo = data.codigo_cliente.trim().toUpperCase();
    const nombre = data.nombre_cliente.trim();
    const telefono = data.telefono_cliente ? data.telefono_cliente.trim() : null;

    const stmt = db.prepare(query);
    const result = stmt.run(codigo, nombre, telefono);

    const getStmt = db.prepare("SELECT * FROM clientes WHERE id = ?");
    return getStmt.get(Number(result.lastInsertRowid));
  }
};
