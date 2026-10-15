import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/app.js";
import { initDatabase } from "../src/config/database.js";

describe("🌐 API HTTP: Pruebas de Integración End-to-End", () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.NODE_ENV = "test";
    await initDatabase();

    await new Promise((resolve) => {
      // Puerto 0 para que el sistema operativo asigne un puerto libre efímero
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // HEALTH CHECK
  // -------------------------------------------------------------
  describe("GET /api/health", () => {
    it("Debe responder 200 OK con el estado del servicio", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, "ok");
      assert.equal(body.service, "taller-bicis-backend");
      assert.ok(body.timestamp);
    });
  });

  // -------------------------------------------------------------
  // REPARACIONES: LISTADO Y FILTROS
  // -------------------------------------------------------------
  describe("GET /api/reparaciones", () => {
    it("Debe retornar listado de órdenes con estructura y paginación por defecto", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 6);
      assert.ok(typeof body.pagination.total === "number");
    });

    it("Debe paginar correctamente con parámetros page y limit", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones?page=1&limit=2`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.data.length <= 2);
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 2);
    });

    it("Debe filtrar por estado válido (Pendiente, En reparación, Terminada)", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones?estado=Pendiente`);
      assert.equal(res.status, 200);
      const body = await res.json();
      for (const item of body.data) {
        assert.equal(item.estado, "Pendiente");
      }
    });

    it("Debe filtrar por término de búsqueda reactiva", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones?search=CLI-001`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].codigo_cliente, "CLI-001");
    });

    it("Debe retornar lista vacía si la búsqueda no coincide con nada", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones?search=TerminoInexistenteXYZ123`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.length, 0);
      assert.equal(body.pagination.total, 0);
    });

    it("Debe ser inmune a inyecciones SQL en parámetros de consulta", async () => {
      const sqliPayload = encodeURIComponent("' OR '1'='1' --");
      const res = await fetch(`${baseUrl}/api/reparaciones?search=${sqliPayload}`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      // No debe romper la consulta ni retornar toda la base de datos sin filtrar
    });
  });

  // -------------------------------------------------------------
  // REPARACIONES: CONSULTA POR ID
  // -------------------------------------------------------------
  describe("GET /api/reparaciones/:id", () => {
    it("Debe retornar 200 y los datos de una orden existente", async () => {
      // Obtenemos una orden primero
      const listRes = await fetch(`${baseUrl}/api/reparaciones?limit=1`);
      const listBody = await listRes.json();
      const existingId = listBody.data[0].id;

      const res = await fetch(`${baseUrl}/api/reparaciones/${existingId}`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, existingId);
      assert.ok(body.data.codigo_cliente);
      assert.ok(body.data.descripcion_bici);
    });

    it("Debe responder 404 Not Found si el ID no existe", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/9999999`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes("No se encontró"));
    });

    it("Debe responder 400 Bad Request si el ID es alfanumérico o inválido", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/id-invalido`);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes("entero positivo"));
    });
  });

  // -------------------------------------------------------------
  // REPARACIONES: CREACIÓN (POST)
  // -------------------------------------------------------------
  describe("POST /api/reparaciones", () => {
    let createdOrderId;

    it("Debe crear una orden de reparación con código nuevo y registrar cliente automáticamente", async () => {
      const codigoNuevo = `CLI-AUTO-${Date.now()}`;
      const payload = {
        codigo_cliente: codigoNuevo,
        nombre_cliente: "Cliente Auto-Creado",
        telefono_cliente: "555-445566",
        descripcion_bici: "BMC Teammachine SLR",
        problema: "Ajuste cambio electrónico Di2",
        estado: "Pendiente"
      };

      const res = await fetch(`${baseUrl}/api/reparaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.id > 0);
      assert.equal(body.data.codigo_cliente, codigoNuevo);
      assert.equal(body.data.estado, "Pendiente");
      createdOrderId = body.data.id;

      // Esperar microtask y verificar que el cliente se indexó en el directorio
      await new Promise(r => setTimeout(r, 50));
      const clientRes = await fetch(`${baseUrl}/api/clientes?search=${codigoNuevo}`);
      const clientBody = await clientRes.json();
      assert.ok(clientBody.data.length >= 1);
      assert.equal(clientBody.data[0].codigo_cliente, codigoNuevo);
    });

    it("Debe responder 400 Bad Request ante payload vacío o campos obligatorios ausentes", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(Array.isArray(body.errors));
      assert.ok(body.errors.length >= 3);
    });

    it("Debe responder 400 Bad Request si el estado proporcionado no es canónico", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: "CLI-ERR",
          descripcion_bici: "Bici",
          problema: "Avería",
          estado: "EstadoInvalidoXYZ"
        })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.errors.some(e => e.includes("no es válido")));
    });

    it("Debe sanear entradas con caracteres especiales y prevenir ataques XSS", async () => {
      const payloadXSS = {
        codigo_cliente: "CLI-XSS",
        descripcion_bici: "<script>alert('xss')</script> Trek",
        problema: "<b onmouseover='alert(1)'>Freno roto</b>",
        estado: "Pendiente"
      };

      const res = await fetch(`${baseUrl}/api/reparaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadXSS)
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      // La orden se almacena como texto plano seguro
      assert.ok(body.data.id > 0);

      // Limpieza
      await fetch(`${baseUrl}/api/reparaciones/${body.data.id}`, { method: "DELETE" });
    });

    after(async () => {
      if (createdOrderId) {
        await fetch(`${baseUrl}/api/reparaciones/${createdOrderId}`, { method: "DELETE" });
      }
    });
  });

  // -------------------------------------------------------------
  // REPARACIONES: CAMBIO DE ESTADO (PATCH)
  // -------------------------------------------------------------
  describe("PATCH /api/reparaciones/:id/estado", () => {
    let targetOrderId;

    before(async () => {
      // Creamos una orden de prueba
      const res = await fetch(`${baseUrl}/api/reparaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: "CLI-PATCH-TEST",
          descripcion_bici: "Cannondale Scalpel",
          problema: "Pérdida de presión en amortiguador",
          estado: "Pendiente"
        })
      });
      const body = await res.json();
      targetOrderId = body.data.id;
    });

    it("Debe transicionar de 'Pendiente' a 'En reparación'", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/${targetOrderId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "En reparación" })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.estado, "En reparación");
    });

    it("Debe transicionar de 'En reparación' a 'Terminada'", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/${targetOrderId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "Terminada" })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.estado, "Terminada");
    });

    it("Debe transicionar de 'Terminada' de vuelta a 'Pendiente' si fuera necesario", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/${targetOrderId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "Pendiente" })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.estado, "Pendiente");
    });

    it("Debe responder 400 Bad Request si el estado es inválido", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/${targetOrderId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "EstadoFalso" })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.errors.length > 0);
    });

    it("Debe responder 404 si la orden no existe", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/999999/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "En reparación" })
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it("Debe responder 400 si el ID es inválido", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/no-es-un-id/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "En reparación" })
      });

      assert.equal(res.status, 400);
    });

    after(async () => {
      if (targetOrderId) {
        await fetch(`${baseUrl}/api/reparaciones/${targetOrderId}`, { method: "DELETE" });
      }
    });
  });

  // -------------------------------------------------------------
  // REPARACIONES: ESTADÍSTICAS (GET /stats)
  // -------------------------------------------------------------
  describe("GET /api/reparaciones/stats", () => {
    it("Debe devolver contadores cuantitativos precisos", async () => {
      const res = await fetch(`${baseUrl}/api/reparaciones/stats`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(typeof body.data.total === "number");
      assert.ok(typeof body.data.pendientes === "number");
      assert.ok(typeof body.data.en_reparacion === "number");
      assert.ok(typeof body.data.terminadas === "number");
      assert.equal(body.data.total, body.data.pendientes + body.data.en_reparacion + body.data.terminadas);
    });
  });

  // -------------------------------------------------------------
  // CLIENTES: DIRECTORIO Y REGISTRO (GET / POST)
  // -------------------------------------------------------------
  describe("GET y POST /api/clientes", () => {
    const testCode = `CLI-TEST-${Date.now()}`;

    it("POST /api/clientes: Debe registrar un nuevo cliente con éxito", async () => {
      const res = await fetch(`${baseUrl}/api/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: testCode,
          nombre_cliente: "Cliente API Test",
          telefono_cliente: "555-776655"
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.codigo_cliente, testCode);
    });

    it("POST /api/clientes: Debe responder 409 Conflict ante intento de duplicar código", async () => {
      const res = await fetch(`${baseUrl}/api/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: testCode,
          nombre_cliente: "Cliente Duplicado",
          telefono_cliente: "555-000000"
        })
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes("Ya existe"));
    });

    it("POST /api/clientes: Debe responder 400 Bad Request si falta código o nombre", async () => {
      const res = await fetch(`${baseUrl}/api/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono_cliente: "555-111111" })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it("GET /api/clientes: Debe buscar clientes por código, nombre o teléfono", async () => {
      const res = await fetch(`${baseUrl}/api/clientes?search=${testCode}`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].codigo_cliente, testCode);
    });
  });

  // -------------------------------------------------------------
  // RUTAS NO ENCONTRADAS (404)
  // -------------------------------------------------------------
  describe("Rutas 404", () => {
    it("Debe devolver 404 estructurado ante rutas inexistentes", async () => {
      const res = await fetch(`${baseUrl}/api/ruta-fantasma`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes("Ruta no encontrada"));
    });
  });
});
