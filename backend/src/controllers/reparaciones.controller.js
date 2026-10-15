import { ReparacionesRepository } from "../repositories/reparaciones.repository.js";
import { ClientesRepository } from "../repositories/clientes.repository.js";
import {
  validateCreateReparacion,
  validateUpdateEstado,
  validateId,
  validatePagination
} from "../validators/reparaciones.validator.js";

export const ReparacionesController = {
  /**
   * GET /api/reparaciones
   * Lista órdenes paginadas con filtros opcionales de estado y búsqueda.
   */
  async getAll(req, res) {
    try {
      const { estado, search } = req.query;
      const { page, limit, offset } = validatePagination(req.query, 6, 50);

      const { rows, total } = await ReparacionesRepository.findAll({
        estado,
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
      console.error("Error al obtener reparaciones:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al consultar las reparaciones."
      });
    }
  },

  /**
   * GET /api/reparaciones/:id
   * Consulta una orden concreta por ID.
   */
  async getById(req, res) {
    try {
      const { isValid, id } = validateId(req.params.id);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "El parámetro ID debe ser un número entero positivo válido."
        });
      }

      const reparacion = await ReparacionesRepository.findById(id);
      if (!reparacion) {
        return res.status(404).json({
          success: false,
          message: `No se encontró ninguna orden de reparación con ID ${id}.`
        });
      }

      res.json({
        success: true,
        data: reparacion
      });
    } catch (error) {
      console.error("Error al obtener reparación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al consultar la reparación."
      });
    }
  },

  /**
   * POST /api/reparaciones
   * Crea una nueva orden de reparación tras validar los datos.
   */
  async create(req, res) {
    try {
      const validation = validateCreateReparacion(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Datos de orden de reparación no válidos.",
          errors: validation.errors
        });
      }

      const nuevaReparacion = await ReparacionesRepository.create(validation.sanitized);

      // Si el cliente no existe aún en la tabla de clientes, se indexa automáticamente
      if (nuevaReparacion.codigo_cliente) {
        ClientesRepository.findByCodigo(nuevaReparacion.codigo_cliente)
          .then((existente) => {
            if (!existente) {
              ClientesRepository.create({
                codigo_cliente: nuevaReparacion.codigo_cliente,
                nombre_cliente: nuevaReparacion.nombre_cliente || `Cliente ${nuevaReparacion.codigo_cliente}`,
                telefono_cliente: nuevaReparacion.telefono_cliente
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }

      res.status(201).json({
        success: true,
        message: "Orden de reparación creada con éxito.",
        data: nuevaReparacion
      });
    } catch (error) {
      console.error("Error al crear reparación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno al guardar la orden de reparación en la base de datos."
      });
    }
  },

  /**
   * PATCH /api/reparaciones/:id/estado
   * Actualiza el estado de la reparación (Pendiente | En reparación | Terminada).
   */
  async updateEstado(req, res) {
    try {
      const idValidation = validateId(req.params.id);
      if (!idValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "El ID proporcionado no es un número entero válido."
        });
      }

      const estadoValidation = validateUpdateEstado(req.body.estado);
      if (!estadoValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Estado proporcionado no válido.",
          errors: estadoValidation.errors
        });
      }

      const reparacionActualizada = await ReparacionesRepository.updateEstado(
        idValidation.id,
        estadoValidation.sanitizedEstado
      );

      if (!reparacionActualizada) {
        return res.status(404).json({
          success: false,
          message: `No se encontró ninguna orden de reparación con ID ${idValidation.id}.`
        });
      }

      res.json({
        success: true,
        message: `Estado actualizado a '${estadoValidation.sanitizedEstado}' correctamente.`,
        data: reparacionActualizada
      });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al actualizar el estado de la reparación."
      });
    }
  },

  /**
   * DELETE /api/reparaciones/:id
   * Elimina una orden por ID.
   */
  async delete(req, res) {
    try {
      const { isValid, id } = validateId(req.params.id);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "El ID proporcionado no es válido."
        });
      }

      const eliminado = await ReparacionesRepository.delete(id);
      if (!eliminado) {
        return res.status(404).json({
          success: false,
          message: `No existe la orden con ID ${id}.`
        });
      }

      res.json({
        success: true,
        message: `Orden de reparación #${id} eliminada correctamente.`
      });
    } catch (error) {
      console.error("Error al eliminar reparación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno al eliminar la orden."
      });
    }
  },

  /**
   * GET /api/reparaciones/stats
   * Retorna métricas cuantitativas para el panel de control.
   */
  async getStats(req, res) {
    try {
      const stats = await ReparacionesRepository.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      res.status(500).json({
        success: false,
        message: "Error interno al calcular estadísticas."
      });
    }
  }
};
