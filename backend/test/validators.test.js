import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCreateReparacion,
  validateUpdateEstado,
  validateId,
  validatePagination,
  ESTADOS_VALIDOS
} from "../src/validators/reparaciones.validator.js";

describe("🔍 Validadores: validateCreateReparacion", () => {
  it("Debe aceptar un payload completo y válido", () => {
    const input = {
      codigo_cliente: "cli-001",
      nombre_cliente: " Juan Pérez ",
      telefono_cliente: " 555-0101 ",
      descripcion_bici: " Orbea Oiz M-Team ",
      problema: " Purgado de frenos Shimano XT ",
      estado: "Pendiente"
    };

    const res = validateCreateReparacion(input);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.sanitized.codigo_cliente, "CLI-001", "Debe transformar el código a mayúsculas");
    assert.equal(res.sanitized.nombre_cliente, "Juan Pérez", "Debe recortar espacios");
    assert.equal(res.sanitized.telefono_cliente, "555-0101");
    assert.equal(res.sanitized.descripcion_bici, "Orbea Oiz M-Team");
    assert.equal(res.sanitized.problema, "Purgado de frenos Shimano XT");
    assert.equal(res.sanitized.estado, "Pendiente");
  });

  it("Debe asignar 'Pendiente' por defecto si el estado se omite o es null/undefined", () => {
    const res1 = validateCreateReparacion({
      codigo_cliente: "CLI-002",
      descripcion_bici: "Trek Marlin",
      problema: "Cadena rota"
    });
    assert.equal(res1.isValid, true);
    assert.equal(res1.sanitized.estado, "Pendiente");

    const res2 = validateCreateReparacion({
      codigo_cliente: "CLI-002",
      descripcion_bici: "Trek Marlin",
      problema: "Cadena rota",
      estado: null
    });
    assert.equal(res2.isValid, true);
    assert.equal(res2.sanitized.estado, "Pendiente");
  });

  it("Debe aceptar todos los estados canónicos definidos", () => {
    for (const estado of ESTADOS_VALIDOS) {
      const res = validateCreateReparacion({
        codigo_cliente: "CLI-003",
        descripcion_bici: "Specialized Tarmac",
        problema: "Centrado de rueda",
        estado
      });
      assert.equal(res.isValid, true, `Debe aceptar estado '${estado}'`);
      assert.equal(res.sanitized.estado, estado);
    }
  });

  it("Debe rechazar estados no canónicos o no reconocidos", () => {
    const estadosInvalidos = ["Cancelada", "En Proceso", "Completada", "123", "TERMINADA", "terminada"];
    for (const estado of estadosInvalidos) {
      const res = validateCreateReparacion({
        codigo_cliente: "CLI-004",
        descripcion_bici: "Giant Defy",
        problema: "Cambio de cables",
        estado
      });
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes("no es válido")));
    }
  });

  it("Debe rechazar si falta codigo_cliente o está vacío o solo contiene espacios", () => {
    const casuisticas = [undefined, null, "", "   ", 12345, {}, []];
    for (const codigo of casuisticas) {
      const res = validateCreateReparacion({
        codigo_cliente: codigo,
        descripcion_bici: "Bici Test",
        problema: "Problema Test"
      });
      assert.equal(res.isValid, false, `Debería rechazar codigo_cliente: ${JSON.stringify(codigo)}`);
      assert.ok(res.errors.some(e => e.includes("codigo_cliente")));
    }
  });

  it("Debe rechazar si falta descripcion_bici o está vacía", () => {
    const casuisticas = [undefined, null, "", "   ", 999, {}];
    for (const desc of casuisticas) {
      const res = validateCreateReparacion({
        codigo_cliente: "CLI-100",
        descripcion_bici: desc,
        problema: "Pinchazo"
      });
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes("descripcion_bici")));
    }
  });

  it("Debe rechazar si falta problema o está vacío", () => {
    const casuisticas = [undefined, null, "", "   ", false];
    for (const prob of casuisticas) {
      const res = validateCreateReparacion({
        codigo_cliente: "CLI-100",
        descripcion_bici: "Bici Test",
        problema: prob
      });
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes("problema")));
    }
  });

  it("Debe reportar múltiples errores si faltan varios campos simultáneamente", () => {
    const res = validateCreateReparacion({});
    assert.equal(res.isValid, false);
    assert.ok(res.errors.length >= 3, "Debe reportar al menos 3 errores (código, bici, problema)");
  });
});

describe("🔍 Validadores: validateUpdateEstado", () => {
  it("Debe validar y sanitizar estados canónicos válidos", () => {
    assert.equal(validateUpdateEstado("Pendiente").isValid, true);
    assert.equal(validateUpdateEstado("En reparación").isValid, true);
    assert.equal(validateUpdateEstado("Terminada").isValid, true);

    // Con espacios alrededor
    const conEspacios = validateUpdateEstado("  En reparación  ");
    assert.equal(conEspacios.isValid, true);
    assert.equal(conEspacios.sanitizedEstado, "En reparación");
  });

  it("Debe rechazar estados vacíos, nulos o no autorizados", () => {
    const invalidos = [null, undefined, "", "   ", "Finalizada", "Cancelado", "Archivada", 42];
    for (const item of invalidos) {
      const res = validateUpdateEstado(item);
      assert.equal(res.isValid, false, `Debería rechazar: ${item}`);
      assert.ok(res.errors.length > 0);
    }
  });
});

describe("🔍 Validadores: validateId", () => {
  it("Debe aceptar enteros positivos válidos en número o string", () => {
    assert.deepEqual(validateId(1), { isValid: true, id: 1 });
    assert.deepEqual(validateId("42"), { isValid: true, id: 42 });
    assert.deepEqual(validateId(" 100 "), { isValid: true, id: 100 });
  });

  it("Debe rechazar IDs no enteros, negativos, cero o strings alfanuméricos", () => {
    const invalidos = [0, -1, "-5", "3.14", 2.5, "abc", "12a", "id-1", null, undefined, "", {}, []];
    for (const id of invalidos) {
      const res = validateId(id);
      assert.equal(res.isValid, false, `Debería rechazar ID: ${JSON.stringify(id)}`);
      assert.equal(res.id, null);
    }
  });
});

describe("🔍 Validadores: validatePagination", () => {
  it("Debe aplicar valores por defecto cuando no se proporcionan o son inválidos", () => {
    const res = validatePagination({});
    assert.equal(res.page, 1);
    assert.equal(res.limit, 6);
    assert.equal(res.offset, 0);

    const resInvalido = validatePagination({ page: "abc", limit: -10 }, 10, 50);
    assert.equal(resInvalido.page, 1);
    assert.equal(resInvalido.limit, 10);
    assert.equal(resInvalido.offset, 0);
  });

  it("Debe calcular correctamente el offset para páginas avanzadas", () => {
    const res = validatePagination({ page: 3, limit: 10 }, 10, 50);
    assert.equal(res.page, 3);
    assert.equal(res.limit, 10);
    assert.equal(res.offset, 20); // (3 - 1) * 10 = 20
  });

  it("Debe acotar el limit al maxLimit para evitar saturación del servidor", () => {
    const res = validatePagination({ page: 1, limit: 1000 }, 6, 50);
    assert.equal(res.limit, 50, "Debe limitar como máximo a 50");
  });
});
