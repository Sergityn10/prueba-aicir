import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { initDatabase, db } from "../src/config/database.js";
import { ReparacionesRepository } from "../src/repositories/reparaciones.repository.js";
import { ClientesRepository } from "../src/repositories/clientes.repository.js";

describe("🗄️ Repositorios y Restricciones de Base de Datos SQLite", () => {
  before(() => {
    initDatabase();
  });

  it("Debe listar reparaciones con paginación y conteo total", async () => {
    const { rows, total } = await ReparacionesRepository.findAll({ limit: 2, offset: 0 });
    assert.ok(Array.isArray(rows));
    assert.ok(rows.length <= 2);
    assert.ok(total >= rows.length);
  });

  it("Debe filtrar reparaciones por estado específico", async () => {
    const { rows } = await ReparacionesRepository.findAll({ estado: "Pendiente" });
    for (const r of rows) {
      assert.equal(r.estado, "Pendiente");
    }
  });

  it("Debe buscar reparaciones por término de texto (descripción, problema o cliente)", async () => {
    const { rows } = await ReparacionesRepository.findAll({ search: "Trek" });
    assert.ok(rows.length >= 1);
    const encontrado = rows.some(r => r.descripcion_bici.includes("Trek"));
    assert.ok(encontrado, "Debe encontrar al menos una orden con 'Trek'");
  });

  it("Debe crear una reparación y recuperarla por ID", async () => {
    const testData = {
      codigo_cliente: "CLI-TEST-REPO",
      nombre_cliente: "Cliente Test Repo",
      telefono_cliente: "555-998877",
      descripcion_bici: "Specialized Stumpjumper",
      problema: "Revisión horquilla Fox",
      estado: "Pendiente"
    };

    const created = await ReparacionesRepository.create(testData);
    assert.ok(created.id > 0);
    assert.equal(created.codigo_cliente, testData.codigo_cliente);

    const retrieved = await ReparacionesRepository.findById(created.id);
    assert.ok(retrieved);
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.descripcion_bici, testData.descripcion_bici);

    // Limpieza
    await ReparacionesRepository.delete(created.id);
    const afterDelete = await ReparacionesRepository.findById(created.id);
    assert.equal(afterDelete, null);
  });

  it("Debe actualizar el estado de una reparación con marca de tiempo updated_at", async () => {
    const created = await ReparacionesRepository.create({
      codigo_cliente: "CLI-STATUS-TEST",
      descripcion_bici: "Orbea Alma",
      problema: "Cambio de piñonera",
      estado: "Pendiente"
    });

    const updated = await ReparacionesRepository.updateEstado(created.id, "En reparación");
    assert.equal(updated.estado, "En reparación");

    const updatedFinal = await ReparacionesRepository.updateEstado(created.id, "Terminada");
    assert.equal(updatedFinal.estado, "Terminada");

    // Limpieza
    await ReparacionesRepository.delete(created.id);
  });

  it("Debe rechazar en el motor SQLite un estado no permitido (CHECK constraint)", () => {
    assert.throws(() => {
      const stmt = db.prepare(`
        INSERT INTO reparaciones (codigo_cliente, descripcion_bici, problema, estado)
        VALUES ('CLI-CHK', 'Bici', 'Avería', 'EstadoIlegal')
      `);
      stmt.run();
    }, /CHECK constraint failed/i);
  });

  it("Debe rechazar en el motor SQLite valores vacíos o nulos en campos obligatorios", () => {
    assert.throws(() => {
      const stmt = db.prepare(`
        INSERT INTO reparaciones (codigo_cliente, descripcion_bici, problema, estado)
        VALUES ('', 'Bici', 'Avería', 'Pendiente')
      `);
      stmt.run();
    }, /CHECK constraint failed/i);
  });

  it("Debe calcular métricas cuantitativas consistentes con getStats", async () => {
    const stats = await ReparacionesRepository.getStats();
    assert.ok(typeof stats.total === "number");
    assert.ok(typeof stats.pendientes === "number");
    assert.ok(typeof stats.en_reparacion === "number");
    assert.ok(typeof stats.terminadas === "number");
    assert.equal(stats.total, stats.pendientes + stats.en_reparacion + stats.terminadas);
  });

  it("Debe gestionar clientes: buscar, crear y evitar duplicados en código", async () => {
    const codigoUnico = `CLI-DBC-${Date.now()}`;
    const clienteCreado = await ClientesRepository.create({
      codigo_cliente: codigoUnico,
      nombre_cliente: "Cliente BD Test",
      telefono_cliente: "555-123456"
    });
    assert.ok(clienteCreado.id > 0);
    assert.equal(clienteCreado.codigo_cliente, codigoUnico);

    const porCodigo = await ClientesRepository.findByCodigo(codigoUnico);
    assert.ok(porCodigo);
    assert.equal(porCodigo.codigo_cliente, codigoUnico);

    // Intentar duplicar código debe lanzar error UNIQUE constraint
    await assert.rejects(
      async () => {
        await ClientesRepository.create({
          codigo_cliente: codigoUnico,
          nombre_cliente: "Cliente Duplicado",
          telefono_cliente: "555-000000"
        });
      },
      /UNIQUE constraint failed/i
    );
  });
});
