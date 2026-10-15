import crypto from "node:crypto";

/**
 * Módulo de Cifrado Híbrido (Envelope Encryption) para Protección de PII
 * Combina RSA (RSA-OAEP con SHA-256) con AES-256-GCM.
 *
 * ¿Por qué Envelope Encryption?
 * RSA por diseño matemático no puede cifrar cadenas arbitrariamente largas.
 * La práctica estándar de la industria (AWS KMS, Google Cloud KMS, Vault) es:
 * 1. Generar una clave de datos simétrica efímera (DEK) de 256 bits.
 * 2. Cifrar la carga de datos del usuario con AES-256-GCM (rápido y con autenticación integrada).
 * 3. Cifrar la DEK con la clave pública RSA (Key Encryption Key - KEK).
 * 4. Almacenar el paquete cifrado (Envelope).
 *
 * Para recuperar los datos:
 * 1. La clave privada RSA descifra la DEK.
 * 2. La DEK descifra y verifica la integridad del contenido con AES-256-GCM.
 */

/**
 * Cifra un objeto con datos privados de usuario utilizando Envelope Encryption.
 * @param {Object} userData - Objeto con datos sensibles (ej: { telefono, email, direccion })
 * @param {string} publicKeyPem - Clave pública RSA en formato PEM
 * @param {string} keyVersion - Versión de la clave maestra para soportar rotación (ej: 'v1')
 * @returns {Object} Sobre cifrado (Envelope) listo para persistir en BD
 */
export function encryptUserData(userData, publicKeyPem, keyVersion = "v1") {
  if (!publicKeyPem) {
    throw new Error("Se requiere la clave pública RSA para cifrar.");
  }

  // 1. Serializar los datos a JSON
  const plaintext = Buffer.from(JSON.stringify(userData), "utf8");

  // 2. Generar Data Encryption Key (DEK) efímera de 256 bits y un IV de 96 bits (recomendado para GCM)
  const dek = crypto.randomBytes(32); // 256 bits
  const iv = crypto.randomBytes(12);  // 96 bits

  // 3. Cifrar los datos con AES-256-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const encryptedPayload = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 128 bits de etiqueta de autenticación para evitar manipulación

  // 4. Cifrar la DEK con la clave pública RSA usando relleno seguro OAEP y hash SHA-256
  const encryptedDek = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    dek
  );

  // 5. Retornar el sobre cifrado (Envelope) serializable
  return {
    algorithm: "AES-256-GCM+RSA-OAEP-SHA256",
    keyVersion,
    encryptedDek: encryptedDek.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    encryptedPayload: encryptedPayload.toString("base64"),
    timestamp: new Date().toISOString()
  };
}

/**
 * Recupera y descifra los datos privados de un usuario a partir de su sobre cifrado.
 * @param {Object} envelope - Sobre cifrado generado por encryptUserData
 * @param {string} privateKeyPem - Clave privada RSA en formato PEM
 * @param {string} [passphrase] - Frase de paso opcional si la clave privada está protegida
 * @returns {Object} Objeto original de datos de usuario descifrado
 */
export function decryptUserData(envelope, privateKeyPem, passphrase = undefined) {
  if (!privateKeyPem) {
    throw new Error("Se requiere la clave privada RSA para descifrar.");
  }

  if (
    !envelope ||
    !envelope.encryptedDek ||
    !envelope.iv ||
    !envelope.authTag ||
    !envelope.encryptedPayload
  ) {
    throw new Error("Estructura de sobre cifrado (envelope) inválida o incompleta.");
  }

  // 1. Descifrar la DEK efímera usando la clave privada RSA
  const privateKeyConfig = {
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256"
  };

  if (passphrase) {
    privateKeyConfig.passphrase = passphrase;
  }

  const dek = crypto.privateDecrypt(
    privateKeyConfig,
    Buffer.from(envelope.encryptedDek, "base64")
  );

  // 2. Preparar el descifrado simétrico AES-256-GCM
  const iv = Buffer.from(envelope.iv, "base64");
  const authTag = Buffer.from(envelope.authTag, "base64");
  const encryptedPayload = Buffer.from(envelope.encryptedPayload, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(authTag);

  // 3. Descifrar y validar integridad (lanzará excepción si el texto o el tag fueron alterados)
  const decryptedBuffer = Buffer.concat([
    decipher.update(encryptedPayload),
    decipher.final()
  ]);

  // 4. Deserializar el JSON y devolver el objeto original
  return JSON.parse(decryptedBuffer.toString("utf8"));
}
