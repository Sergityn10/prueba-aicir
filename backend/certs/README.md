# Directorio de Claves Criptográficas (RSA / Certificados)

Este directorio está destinado a almacenar las claves criptográficas para el cifrado asimétrico y la firma de tokens en entornos de desarrollo local.

⚠️ **IMPORTANTE DE SEGURIDAD**:
- Las claves privadas (`private_key.pem`, `*.key`) **NUNCA** deben subirse a repositorios Git.
- El archivo `.gitignore` de esta carpeta excluye automáticamente cualquier archivo `.pem` o `.key`.
- En entornos de producción empresarial, las claves deben ser gestionadas mediante servicios KMS (**AWS KMS, HashiCorp Vault o Azure Key Vault**) o mediante **Docker/Kubernetes Secrets**, sin almacenarse como archivos en el disco de la aplicación.

Para generar un par de claves local para pruebas:
```bash
# Con OpenSSL:
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -pubout -in private_key.pem -out public_key.pem
```
