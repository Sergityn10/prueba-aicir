import { ClientesRepository } from "../repositories/clientes.repository.js";
import { validatePagination } from "../validators/reparaciones.validator.js";

export const ClientesController = {
  /**
   * GET /api/clientes
   * Lista o busca clientes existentes con paginación.
   */
  async getAll(req, res) {
    try {
      const { search } = req.query;
      const { page, limit, offset } = validatePagination(req.query, 10, 50);

      const { rows, total } = await ClientesRepository.findAll({
        search,
        limit,
        offset
      });

      const totalPages = Math.ceil(total / limit) || 1;

      res.json({
        success: true,
        count: rows.length,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error("Error al consultar clientes:", error);
      res.status(500).json({
        success: false,
        message: "Error interno al consultar la lista de clientes."
      });
    }
  },

  /**
   * POST /api/clientes
   * Crea un nuevo cliente en el directorio del taller.
   */
  async create(req, res) {
    try {
      const { codigo_cliente, nombre_cliente, telefono_cliente } = req.body;

      if (!codigo_cliente || typeof codigo_cliente !== "string" || codigo_cliente.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "El código de cliente es obligatorio."
        });
      }

      if (!nombre_cliente || typeof nombre_cliente !== "string" || nombre_cliente.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "El nombre del cliente es obligatorio."
        });
      }

      // Comprobar si ya existe un cliente con ese código
      const existente = await ClientesRepository.findByCodigo(codigo_cliente);
      if (existente) {
        return res.status(409).json({
          success: false,
          message: `Ya existe un cliente registrado con el código '${codigo_cliente.toUpperCase()}'.`,
          data: existente
        });
      }

      const nuevoCliente = await ClientesRepository.create({
        codigo_cliente,
        nombre_cliente,
        telefono_cliente
      });

      res.status(201).json({
        success: true,
        message: "Cliente registrado con éxito.",
        data: nuevoCliente
      });
    } catch (error) {
      console.error("Error al registrar cliente:", error);
      res.status(500).json({
        success: false,
        message: "Error interno al guardar el cliente."
      });
    }
  }
};
