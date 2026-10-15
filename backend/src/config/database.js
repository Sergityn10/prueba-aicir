import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, "../../taller.db");

// Instancia única y persistente de base de datos local SQLite
export const db = new DatabaseSync(DB_PATH);

console.log(` Connected to native SQLite database at: ${DB_PATH}`);

/**
 * Inicializa las tablas necesarias y semillas de datos si la base de datos está vacía.
 */
export function initDatabase() {
  // 1. Tabla de clientes (desacoplamiento de datos y búsqueda en taller)
  const createClientesSQL = `
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_cliente TEXT UNIQUE NOT NULL CHECK(length(trim(codigo_cliente)) > 0),
      nombre_cliente TEXT NOT NULL CHECK(length(trim(nombre_cliente)) > 0),
      telefono_cliente TEXT,
      fecha_creacion TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `;
  db.exec(createClientesSQL);

  // 2. Tabla de reparaciones con restricciones de integridad relacional (cuidado del dato)
  const createReparacionesSQL = `
    CREATE TABLE IF NOT EXISTS reparaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_cliente TEXT NOT NULL CHECK(length(trim(codigo_cliente)) > 0),
      nombre_cliente TEXT,
      telefono_cliente TEXT,
      descripcion_bici TEXT NOT NULL CHECK(length(trim(descripcion_bici)) > 0),
      problema TEXT NOT NULL CHECK(length(trim(problema)) > 0),
      estado TEXT NOT NULL CHECK(estado IN ('Pendiente', 'En reparación', 'Terminada')) DEFAULT 'Pendiente',
      fecha_creacion TEXT DEFAULT (datetime('now', 'localtime')),
      fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `;
  db.exec(createReparacionesSQL);

  // 3. Semillas de Clientes Ficticios
  const countClientes = db.prepare("SELECT COUNT(*) AS total FROM clientes").get();
  if (countClientes.total === 0) {
    console.log("🌱 Insertando clientes iniciales ficticios...");
    const insertCliente = db.prepare(`
      INSERT INTO clientes (codigo_cliente, nombre_cliente, telefono_cliente)
      VALUES (?, ?, ?)
    `);

    const clientesSeed = [
      ['CLI-001', 'Cliente Ficticio 01', '555-010001'],
      ['CLI-002', 'Cliente Ficticio 02', '555-010002'],
      ['CLI-003', 'Cliente Ficticio 03', '555-010003'],
      ['CLI-004', 'Cliente Ficticio 04', '555-010004']
    ];

    for (const c of clientesSeed) {
      insertCliente.run(...c);
    }
  }

  // 4. Semillas de Reparaciones Ficticias
  const countRow = db.prepare("SELECT COUNT(*) AS total FROM reparaciones").get();
  if (countRow.total === 0) {
    console.log("🌱 Insertando órdenes iniciales con datos 100% ficticios...");
    const seedInsert = db.prepare(`
      INSERT INTO reparaciones (codigo_cliente, nombre_cliente, telefono_cliente, descripcion_bici, problema, estado)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedData = [
      ['CLI-001', 'Cliente Ficticio 01', '555-010001', 'Trek Marlin 7 - Azul (Montaña)', 'Freno de disco trasero roza y no tiene suficiente tacto', 'Pendiente'],
      ['CLI-002', 'Cliente Ficticio 02', '555-010002', 'Specialized Allez - Roja (Carretera)', 'Desajuste en cambio trasero; salta entre piñones 4 y 5', 'En reparación'],
      ['CLI-003', 'Cliente Ficticio 03', '555-010003', 'Brompton M6L - Verde (Plegable)', 'Pinchazo en rueda delantera y holgura en el manillar', 'Terminada'],
      ['CLI-004', 'Cliente Ficticio 04', '555-010004', 'Giant Escape 3 - Gris (Urbana)', 'Revisión general pre-temporada, engrase de transmisión y centrado de rueda', 'Pendiente']
    ];

    for (const item of seedData) {
      seedInsert.run(...item);
    }
    console.log(" Datos semilla sintéticos inicializados correctamente.");
  }
}
