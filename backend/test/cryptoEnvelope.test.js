import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { encryptUserData, decryptUserData } from "../src/utils/cryptoEnvelope.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERTS_DIR = path.resolve(__dirname, "../certs");
const privPath = path.join(CERTS_DIR, "private_key.pem");
const pubPath = path.join(CERTS_DIR, "public_key.pem");

describe("🔐 Criptografía: Envelope Encryption (RSA-OAEP-SHA256 + AES-256-GCM)", () => {
  let publicKey;
  let privateKey;

  before(() => {
    // Si no existen las claves de prueba, las generamos en memoria para los tests
    if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
      privateKey = fs.readFileSync(privPath, "utf8");
      publicKey = fs.readFileSync(pubPath, "utf8");
    } else {
      const keys = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      });
      privateKey = keys.privateKey;
      publicKey = keys.publicKey;
    }
  });

  it("Debe cifrar y descifrar con éxito un objeto complejo con datos privados de cliente", () => {
    const datosOriginales = {
      codigo_cliente: "CLI-999",
      nombre_completo: "Cliente Sintético de Pruebas",
      telefono: "555-019999",
      email: "test.contacto@taller-ejemplo.local",
      direccion: "Avenida Principal 45, Planta 2B, Madrid",
      notas_privadas: "Solicitó no recibir llamadas antes de las 10:00 AM"
    };

    const envelope = encryptUserData(datosOriginales, publicKey, "v1");

    // Verificar estructura del sobre criptográfico
    assert.ok(envelope.encryptedDek, "Debe contener DEK cifrada");
    assert.ok(envelope.iv, "Debe contener IV");
    assert.ok(envelope.authTag, "Debe contener etiqueta de autenticación (authTag)");
    assert.ok(envelope.encryptedPayload, "Debe contener payload cifrado");
    assert.equal(envelope.algorithm, "AES-256-GCM+RSA-OAEP-SHA256");
    assert.equal(envelope.keyVersion, "v1");

    // Descifrado y recuperación
    const recuperados = decryptUserData(envelope, privateKey);
    assert.deepEqual(recuperados, datosOriginales);
  });

  it("Debe detectar manipulación en el payload cifrado (Anti-Tampering)", () => {
    const envelope = encryptUserData({ dato: "secreto" }, publicKey);

    // Corrompemos el payload
    const payloadBuffer = Buffer.from(envelope.encryptedPayload, "base64");
    payloadBuffer[0] ^= 0xff; // Invertir bits del primer byte
    const envelopeCorrupto = {
      ...envelope,
      encryptedPayload: payloadBuffer.toString("base64")
    };

    assert.throws(
      () => decryptUserData(envelopeCorrupto, privateKey),
      /Unsupported state or unable to authenticate data|bad decrypt/i,
      "GCM debe rechazar el payload alterado"
    );
  });

  it("Debe detectar manipulación en el authTag", () => {
    const envelope = encryptUserData({ dato: "secreto" }, publicKey);

    // Corrompemos el authTag
    const tagBuffer = Buffer.from(envelope.authTag, "base64");
    tagBuffer[0] ^= 0xaa;
    const envelopeCorrupto = {
      ...envelope,
      authTag: tagBuffer.toString("base64")
    };

    assert.throws(
      () => decryptUserData(envelopeCorrupto, privateKey),
      /Unsupported state or unable to authenticate data|bad decrypt/i
    );
  });

  it("Debe fallar si se intenta descifrar con una clave privada distinta", () => {
    const envelope = encryptUserData({ dato: "confidencial" }, publicKey);

    // Generamos otra clave privada ajena
    const { privateKey: otraClavePrivada } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    assert.throws(
      () => decryptUserData(envelope, otraClavePrivada),
      /data greater than mod len|oaep decoding error|bad decrypt/i
    );
  });

  it("Debe validar que las claves y parámetros requeridos no sean nulos", () => {
    assert.throws(() => encryptUserData({ a: 1 }, null), /Se requiere la clave pública/);
    assert.throws(() => decryptUserData(null, privateKey), /Estructura de sobre/);
    assert.throws(() => decryptUserData({}, privateKey), /Estructura de sobre/);
    assert.throws(() => decryptUserData({ encryptedDek: "a", iv: "b", authTag: "c", encryptedPayload: "d" }, null), /Se requiere la clave privada/);
  });
});
