import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERTS_DIR = path.resolve(__dirname, "../certs");

if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

console.log("🔐 Generando par de claves RSA de 4096 bits (compatible con RSA-256 / OAEP)...");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
});

const privPath = path.join(CERTS_DIR, "private_key.pem");
const pubPath = path.join(CERTS_DIR, "public_key.pem");

// Guardar con permisos restrictivos (solo lectura/escritura para el dueño)
fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });

console.log(` Clave privada generada en: ${privPath}`);
console.log(` Clave pública generada en: ${pubPath}`);
console.log(" Recuerda que las claves privadas nunca deben subirse a repositorios Git.");
