import { initDatabase, db } from "./src/config/database.js";
import { ReparacionesRepository } from "./src/repositories/reparaciones.repository.js";
import { ClientesRepository } from "./src/repositories/clientes.repository.js";
import {
  validateCreateReparacion,
  validateUpdateEstado,
} from "./src/validators/reparaciones.validator.js";

async function runSmokeTest() {
  console.log("▶ Iniciando Smoke Test de Backend...");
  initDatabase();

  // Test 1: List all
  const { rows: all, total } = await ReparacionesRepository.findAll();
  console.log(
    `✅ Listar reparaciones: se obtuvieron ${all.length} órdenes (Total: ${total}).`,
  );
  if (all.length === 0) throw new Error("No hay órdenes iniciales.");

  // Test 2: Validation test
  const invalidPayload = validateCreateReparacion({ codigo_cliente: "" });
  if (invalidPayload.isValid)
    throw new Error("La validación debería fallar para código vacío.");
  console.log(
    "✅ Validación defensiva: rechaza payloads incompletos correctamente.",
  );

  // Test 3: Create repair
  const validPayload = validateCreateReparacion({
    codigo_cliente: "CLI-999",
    nombre_cliente: "Cliente Sintético Test",
    telefono_cliente: "555-010999",
    descripcion_bici: "Cannondale Topstone 4",
    problema: "Ajuste de cables de frenos",
    estado: "Pendiente",
  });
  const created = await ReparacionesRepository.create(validPayload.sanitized);
  console.log(`✅ Crear reparación: orden #${created.id} creada con éxito.`);

  // Test 4: Update status
  const updated = await ReparacionesRepository.updateEstado(
    created.id,
    "En reparación",
  );
  if (updated.estado !== "En reparación")
    throw new Error("El estado no se actualizó.");
  console.log(
    `✅ Actualizar estado: orden #${created.id} pasó a '${updated.estado}'.`,
  );

  // Test 5: Validation for invalid state
  const invalidStatus = validateUpdateEstado("EstadoInventado");
  if (invalidStatus.isValid)
    throw new Error("No debe aceptar estados no definidos.");
  console.log(
    "✅ Validación de estado: rechaza estados no canónicos correctamente.",
  );

  // Test 6: Stats
  const stats = await ReparacionesRepository.getStats();
  console.log("✅ Estadísticas calculadas:", stats);

  // Test 7: Clientes search and create
  const { rows: clientesList } = await ClientesRepository.findAll({
    search: "CLI-001",
  });
  if (clientesList.length === 0)
    throw new Error("No se encontró el cliente inicial CLI-001.");
  console.log(
    `✅ Búsqueda de clientes: encontrado cliente '${clientesList[0].nombre_cliente}' (${clientesList[0].codigo_cliente}).`,
  );

  // Cleanup created test order
  await ReparacionesRepository.delete(created.id);
  console.log("✅ Limpieza: orden de prueba eliminada.");

  // Close db
  db.close();
  console.log("🎉 ¡Todos los tests de backend pasaron exitosamente!");
}

runSmokeTest().catch((err) => {
  console.error("❌ Falló el smoke test:", err);
  process.exit(1);
});
