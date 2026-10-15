# Directorio de Claves Criptográficas (RSA / Certificados)
Este directorio está destinado a almacenar las claves criptográficas para el cifrado asimétrico y la firma de tokens en entornos de desarrollo local.

⚠️ **IMPORTANTE DE SEGURIDAD**:
- Las claves privadas (`private_key.pem`, `*.key`) **NUNCA** deben subirse a repositorios Git.
- El archivo `.gitignore` de esta carpeta excluye automáticamente cualquier archivo `.pem` o `.key`.
- En entornos de producción empresarial, las claves deben ser gestionadas mediante servicios KMS (**AWS KMS, HashiCorp Vault o Azure Key Vault**) o mediante **Docker/Kubernetes Secrets**, sin almacenarse como archivos en el disco de la aplicación.

## Instalación de OpenSSL

### Windows
1. **Opción recomendada**: Descargar desde [slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)
   - Descargar "Win64 OpenSSL v3.x.x" (versión completa, no Light)
   - Ejecutar el instalador y seguir las instrucciones
   - Añadir `C:\Program Files\OpenSSL-Win64\bin` al PATH del sistema

2. **Con Chocolatey**:
   ```powershell
   choco install openssl
   ```

3. **Con winget**:
   ```powershell
   winget install ShiningLight.OpenSSL
   ```

### macOS
```bash
# Con Homebrew (recomendado):
brew install openssl

# Verificar instalación:
openssl version
```

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install openssl
```

### Linux (Fedora/RHEL/CentOS)
```bash
sudo dnf install openssl
# o en versiones antiguas:
sudo yum install openssl
```

## Generación de Claves RSA

Una vez instalado OpenSSL, ejecutar:
```bash
# Generar clave privada RSA de 4096 bits:
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096

# Extraer la clave pública:
openssl rsa -pubout -in private_key.pem -out public_key.pem
```
