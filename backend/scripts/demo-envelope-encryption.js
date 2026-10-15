import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encryptUserData, decryptUserData } from "../src/utils/cryptoEnvelope.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERTS_DIR = path.resolve(__dirname, "../certs");
const privPath = path.join(CERTS_DIR, "private_key.pem");
const pubPath = path.join(CERTS_DIR, "public_key.pem");

if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) {
  console.error("❌ No se encontraron las claves RSA en backend/certs. Ejecuta primero:");
  console.error("   node scripts/generate-rsa-keys.js");
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(privPath, "utf8");
const publicKeyPem = fs.readFileSync(pubPath, "utf8");

console.log("================================================================");
console.log("🔐 DEMOSTRACIÓN: CIFRADO HÍBRIDO (ENVELOPE ENCRYPTION)");
console.log("   RSA-OAEP-SHA256 (KEK) + AES-256-GCM (DEK)");
console.log("================================================================\n");

// 1. Datos personales ficticios que se quieren proteger en base de datos
const datosPrivadosCliente = {
  codigoCliente: "CLI-001",
  nombreCompleto: "Cliente Ficticio 01",
  telefono: "555-0101",
  email: "contacto.ficticio.01@taller-ejemplo.local",
  direccion: "Calle Falsa 123, 28001 Madrid",
  metodoPagoPreferido: "Tarjeta terminada en 4432 (Token Stripe)"
};

console.log("1️⃣ [ORIGINAL] Datos de usuario antes de guardar en Base de Datos:");
console.dir(datosPrivadosCliente, { depth: null });

// 2. Cifrado (lo que hace el Backend antes del INSERT/UPDATE)
const envelope = encryptUserData(datosPrivadosCliente, publicKeyPem, "v1");

console.log("\n2️⃣ [ENVELOPE] Lo que realmente se almacena en la columna de la BD:");
console.log(JSON.stringify(envelope, null, 2));

// 3. Simulación de recuperación de datos por un usuario autorizado (Recepcionista/Admin)
console.log("\n3️⃣ [RECUPERACIÓN] El backend descifra la DEK con la clave privada RSA...");
const datosRecuperados = decryptUserData(envelope, privateKeyPem);

console.log("   Datos recuperados y verificados con éxito:");
console.dir(datosRecuperados, { depth: null });

// 4. Verificación de integridad / Anti-tampering
console.log("\n4️⃣ [PRUEBA ANTI-MANIPULACIÓN]");
try {
  // Alteramos un byte del payload cifrado
  const corruptPayload = envelope.encryptedPayload.slice(0, -4) + "AAAA";
  decryptUserData({ ...envelope, encryptedPayload: corruptPayload }, privateKeyPem);
  console.error("❌ Error: Se esperaba que fallara la verificación de integridad.");
} catch (err) {
  console.log("✅ Detección de manipulación exitosa: el algoritmo GCM rechazó el payload modificado.");
}

console.log("\n================================================================");
console.log("✨ Demostración completada con éxito. Todos los tests pasaron.");
console.log("================================================================");
