# 📐 Propuesta de Mejoras Técnicas y Arquitectura Empresarial
> **Taller de Bicicletas — Evolución de Prototipo a Sistema de Producción Escalable y Seguro**
> **Autor:** Sergio | Proceso de Selección PRET/TR3S60 en **aicir**

---

## 🎯 1. Introducción y Visión General

El prototipo actual resuelve eficazmente los requisitos funcionales básicos: registro de bicicletas, consulta paginada, gestión del ciclo de vida de la reparación mediante Kanban/Tabla y búsqueda reactiva de clientes con persistencia local en SQLite.

El objetivo de este documento es proponer un **plan integral de ingeniería de software** para evolucionar este prototipo hacia una **plataforma empresarial robusta, de alta disponibilidad y lista para producción**, capaz de dar servicio a una red multisede o franquicias de talleres de bicicletas.

Se abordan cuatro pilares fundamentales:
1. **Ciberseguridad y Protección en Profundidad (Defense in Depth)**.
2. **Control de Acceso, Identidad y Roles Administrativos (RBAC/ABAC)**.
3. **Estructuras de Acoplamiento y Desacoplamiento (Arquitectura Hexagonal y EDA)**.
4. **Cuidado Avanzado del Dato, Observabilidad y Estrategia DevOps**.

---

## 🔒 2. Ciberseguridad y Protección en Profundidad

Para mitigar los principales vectores de ataque recogidos en el **OWASP Top 10** y garantizar el cumplimiento normativo (**RGPD / ENS**), se proponen las siguientes medidas:

```mermaid
flowchart TD
    Client["🌐 Cliente Web / Móvil"]
    WAF["🛡️ WAF & Reverse Proxy (Rate Limiting, TLS 1.3, DDoS)"]
    Gateway["🚪 API Gateway (Validación JWT, Helmet, CORS estricto)"]
    Service["⚙️ Capa de Aplicación (Validación Zod, Sanitización, RBAC)"]
    DB[("🗄️ Base de Datos (Cifrado AES-256 en Reposo, TLS en Tránsito)")]

    Client --> WAF
    WAF --> Gateway
    Gateway --> Service
    Service --> DB
```

### 2.1. Autenticación y Gestión de Sesiones Segura
- **Tokens Duales (Access Token + Refresh Token)**:
  - *Access Token*: JWT de vida corta (15 minutos) firmado con clave asimétrica `RS256`.
  - *Refresh Token*: Almacenado en cookie con banderas estrictas: `httpOnly`, `Secure`, `SameSite=Strict` y `Path=/api/auth/refresh`. Evita por diseño el robo de sesiones mediante ataques de Cross-Site Scripting (XSS).
- **MFA / 2FA Obligatorio para Administradores**:
  - Implementación de autenticación de doble factor mediante TOTP (Google Authenticator, Microsoft Authenticator) para perfiles de administración o recepción.
- **Revocación de Sesiones mediante Lista Negra en Redis**:
  - Mecanismo de invalidación inmediata de tokens en caso de detección de accesos sospechosos o cambio de contraseñas.

### 2.2. Seguridad Perimetral y Anti-Saturación (Anti-DoS / Anti-Bruteforce)
- **Rate Limiting Dinámico por IP y por Usuario**:
  - Limitación general de la API (ej: 100 peticiones / minuto / IP) usando Redis con algoritmo *Token Bucket*.
  - Limitación estricta en endpoints críticos como `/api/auth/login` o creación masiva de órdenes (5 intentos fallidos bloquean la IP durante 15 minutos).
- **Protección de Cabeceras HTTP (`Helmet`)**:
  - `Content-Security-Policy (CSP)` estricto para impedir la inyección de scripts externos.
  - `Strict-Transport-Security (HSTS)` para forzar conexiones HTTPS con precarga (`max-age=31536000; includeSubDomains; preload`).
  - `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff`.

### 2.3. Cuidado Defensivo y Validación de Entradas
- **Contratos de Datos con Tipado Estricto (Zod / Joi)**:
  - Validación de esquemas en tiempo de ejecución tanto en backend como en frontend. Si un payload no coincide exactamente con el esquema esperado, se rechaza de inmediato antes de invocar la lógica de negocio.
- **Sanitización y Prevención de Inyecciones**:
  - Mantener consultas preparadas y parametrizadas (ya implementadas en el prototipo).
  - Sanitización de entradas textuales libres con librerías como `DOMPurify` o `sanitize-html` para evitar almacenamiento de payloads XSS en el campo `problema` o `observaciones`.

### 2.4. Hardening de Contenedores Docker
- **Usuarios sin Privilegios**: Configurar en los Dockerfiles `USER node` o `USER appuser` en lugar de ejecutar los contenedores como `root`.
- **Imágenes Reducidas**: Uso de imágenes base `distroless` o `alpine` despojadas de herramientas innecesarias (`curl`, `sh`, `gcc`) para minimizar la superficie de ataque.
- **Escaneo Automatizado de Dependencias y Contenedores**: Integración en el pipeline de CI/CD de herramientas como `Trivy`, `Snyk` o `npm audit` bloqueando builds con vulnerabilidades medias/altas.

### 2.5. Cifrado Asimétrico y Recuperación de Datos Privados con RSA (Cifrado Híbrido / Envelope Encryption)

Para proteger datos personales de identificación (PII como teléfonos, emails, direcciones o datos de facturación) tanto en reposo como frente a filtraciones de base de datos o volcados de memoria, se aplica **Cifrado Asimétrico con Envelope Encryption** (el estándar utilizado por AWS KMS, GCP KMS y HashiCorp Vault).

#### 2.5.1. Fundamento Criptográfico: ¿Por qué Envelope Encryption con RSA?
Matemáticamente, los algoritmos de clave pública como RSA no están diseñados para cifrar cargas de datos arbitrariamente largas ni repetitivas debido a:
1. **Límite de tamaño del bloque**: RSA-2048 con relleno OAEP-SHA256 solo puede cifrar hasta ~190 bytes (RSA-4096 hasta ~446 bytes). Intentar cifrar cadenas más largas directamente con RSA causa un error criptográfico.
2. **Rendimiento**: RSA es computacionalmente hasta 1.000 veces más lento que el cifrado simétrico por hardware (AES-NI).

**La Solución Estándar: Envelope Encryption (Cifrado Híbrido)**:
- Para cada registro de cliente, el backend genera una clave simétrica efímera de un solo uso: **DEK (Data Encryption Key)** de 256 bits (`AES-256-GCM`).
- El payload JSON con los datos privados se cifra a ultra-alta velocidad con AES-256-GCM, generando además una etiqueta de autenticación (`authTag` de 128 bits) que garantiza la integridad anti-manipulación.
- La DEK se cifra usando la clave pública RSA de 4096 bits (**KEK - Key Encryption Key**) con relleno seguro `RSA_PKCS1_OAEP_PADDING` y función de hash `SHA-256`.
- En la base de datos se almacena el sobre criptográfico (**Envelope**):
  ```json
  {
    "algorithm": "AES-256-GCM+RSA-OAEP-SHA256",
    "keyVersion": "v1",
    "encryptedDek": "3Nwi99DAzg0YRnR...",
    "iv": "+pwOZUUSF4PAcv4M",
    "authTag": "1yA90meIDdmaXirvJM1G9A==",
    "encryptedPayload": "flLxZDvz/2TPFrc...",
    "timestamp": "2026-10-15T16:19:33.153Z"
  }
  ```

#### 2.5.2. Flujo de Recuperación y Descifrado Seguro
Cuando un rol autorizado (ej: *Recepcionista* o *Administrador*, según la matriz RBAC) necesita visualizar los datos de contacto:
1. El backend consulta el registro de cliente y recupera el sobre cifrado.
2. El servicio de criptografía extrae `encryptedDek` y lo descifra utilizando la **Clave Privada RSA** (`private_key.pem`).
3. Con la DEK en memoria volátil y efímera, descifra `encryptedPayload` y valida contra el `authTag` (si algún byte en base de datos fue manipulado, se aborta con excepción).
4. Los datos recuperados se devuelven en claro al cliente y se registra la lectura en `audit_logs`.
5. La DEK se descarta inmediatamente de la memoria RAM del proceso (recolección de basura / zero-fill).

```mermaid
sequenceDiagram
    autonumber
    actor Rec as 💼 Recepcionista
    participant API as ⚙️ Backend API
    participant Crypto as 🔐 Módulo Cripto
    participant Key as 🗝️ Clave Privada RSA
    participant DB as 🗄️ Base de Datos

    Note over Rec,DB: 📥 Flujo de Guardado (Cifrado con Clave Pública)
    Rec->>API: POST /api/clientes (nombre, tlf, email)
    API->>Crypto: encryptUserData(datos, publicKey)
    Crypto->>Crypto: Genera DEK efímera (AES-256)
    Crypto->>Crypto: Cifra payload con AES-256-GCM
    Crypto->>Crypto: Cifra DEK con Clave Pública RSA-OAEP
    Crypto-->>API: Retorna Envelope JSON
    API->>DB: INSERT INTO clientes (codigo, envelope_datos_privados)

    Note over Rec,DB: 📤 Flujo de Recuperación (Descifrado con Clave Privada)
    Rec->>API: GET /api/clientes/CLI-001/contacto
    API->>API: Verifica RBAC y audita acceso
    API->>DB: SELECT envelope_datos_privados WHERE codigo='CLI-001'
    DB-->>API: Envelope JSON
    API->>Crypto: decryptUserData(envelope, privateKey)
    Crypto->>Key: Descifra encryptedDek con Clave Privada RSA
    Key-->>Crypto: DEK en claro
    Crypto->>Crypto: Descifra y valida payload con AES-GCM (authTag)
    Crypto-->>API: Datos de cliente en claro
    API-->>Rec: 200 OK { telefono: "555-0101", ... }
```

#### 2.5.3. Pasos para Generar las Claves Criptográficas
Existen dos métodos recomendados y probados en el proyecto:

**Opción A: Mediante el script automatizado del proyecto (Node.js nativo)**:
```bash
# Dentro de la carpeta /backend
npm run generate:keys
```
*Este comando genera internamente un par de claves RSA de 4096 bits en formato PKCS#8 / SPKI mediante `node:crypto` sin dependencias externas.*

**Opción B: Mediante OpenSSL en terminal**:
```bash
# 1. Generar la clave privada RSA de 4096 bits en formato PEM
openssl genpkey -algorithm RSA -out backend/certs/private_key.pem -pkeyopt rsa_keygen_bits:4096

# 2. Extraer la clave pública correspondiente en formato SPKI/X.509
openssl rsa -pubout -in backend/certs/private_key.pem -out backend/certs/public_key.pem

# 3. Aplicar permisos de solo lectura al propietario (Linux/macOS)
chmod 600 backend/certs/private_key.pem
chmod 644 backend/certs/public_key.pem
```

#### 2.5.4. Estructura de Carpetas, Permisos y Gestión de Secretos

```
backend/
├── certs/
│   ├── .gitignore              # OBLIGATORIO: Ignora *.pem, *.key, *.crt
│   ├── README.md               # Instrucciones de seguridad para desarrolladores
│   ├── private_key.pem         # CLAVE PRIVADA (NUNCA en Git, permisos 600)
│   └── public_key.pem          # CLAVE PÚBLICA (Puede distribuirse a servicios emisores)
├── scripts/
│   ├── generate-rsa-keys.js    # Generador automatizado de claves
│   └── demo-envelope-encryption.js # Demostración funcional y test anti-tampering
└── src/
    └── utils/
        └── cryptoEnvelope.js   # Lógica pura de Cifrado/Descifrado
```

**Reglas de Protección en Desarrollo y CI**:
1. **Exclusión en `.gitignore`**:
   ```gitignore
   # backend/certs/.gitignore
   *.pem
   *.key
   *.pkcs8
   *.pfx
   *.crt
   !README.md
   ```
2. **Permisos de Archivo**:
   - En sistemas UNIX/Linux: `chmod 700 backend/certs` y `chmod 600 backend/certs/private_key.pem`.
   - En Windows (PowerShell): Eliminar herencia de permisos y asignar lectura únicamente al usuario de ejecución de la aplicación:
     ```powershell
     icacls backend\certs\private_key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
     ```
3. **Inyección en Tiempo de Ejecución**:
   El backend no debe tener rutas hardcodeadas. Se configuran variables de entorno:
   ```env
   RSA_PRIVATE_KEY_PATH=/run/secrets/rsa_private_key
   RSA_PUBLIC_KEY_PATH=/app/certs/public_key.pem
   # O alternativamente el contenido codificado en Base64:
   # RSA_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...
   ```

#### 2.5.5. Hoja de Ruta si el Proyecto Escala a Producción

A medida que el taller o la empresa crece, el almacenamiento de claves en ficheros locales del servidor debe evolucionar hacia arquitecturas de gestión de claves centralizadas y módulos de seguridad hardware (HSM):

| Etapa del Proyecto | Dónde Almacenar las Claves | Cómo Funciona el Descifrado | Seguridad y Cumplimiento |
| :--- | :--- | :--- | :--- |
| **1. Desarrollo Local / Prototipo** | Carpeta `backend/certs/` protegida con `chmod 600` e ignorada en Git. | El proceso Node.js lee el archivo `.pem` del disco local. | Aislado en máquina de desarrollo. |
| **2. Contenedores / Staging (Docker / K8s)** | **Docker Secrets** o **Kubernetes Secrets** montados en volúmenes en memoria (`tmpfs` en `/run/secrets/`). | El contenedor accede en solo lectura al secreto montado en memoria RAM volátil; nunca reside en la imagen Docker. | Evita filtración en imágenes o capas de Git. |
| **3. Producción Empresarial Cloud (AWS / GCP / Azure)** | **Cloud KMS (Key Management Service)**:<br>• AWS KMS con AWS Secrets Manager<br>• Google Cloud KMS<br>• Azure Key Vault | **Zero-Knowledge**: La clave privada **NUNCA sale del HSM (Hardware Security Module con certificación FIPS 140-2 Nivel 3)**. El backend envía la `encryptedDek` a la API de KMS mediante roles IAM autenticados y recibe la DEK en memoria. | Máxima seguridad bancaria / sanitaria. Cumplimiento ISO 27001, ENS, RGPD, PCI-DSS. |
| **4. Multi-Cloud o On-Premises Avanzado** | **HashiCorp Vault** (Transit Secrets Engine). | Vault actúa como proveedor de Cifrado como Servicio (*Encryption as a Service*). Registra auditoría forense de cada llamada criptográfica. | Rotación automática, control granular por políticas ACL y tokens dinámicos. |

**Buenas Prácticas Críticas para Escalar**:
1. **Rotación Periódica de Claves (Key Rotation)**:
   - Las claves maestras deben rotarse periódicamente (ej: cada 90 o 365 días).
   - Gracias al campo `keyVersion` (`"v1"`, `"v2"`) presente en el sobre cifrado, el sistema puede descifrar registros antiguos con claves anteriores y cifrar nuevos registros con la clave vigente sin necesidad de migrar o reescribir toda la base de datos de manera síncrona.
   - Procesos *worker* en segundo plano (*Re-encryption batch jobs*) pueden re-cifrar gradualmente registros antiguos con la última versión de la clave.
2. **Separación de Privilegios Criptográficos**:
   - El microservicio de recepción/creación de órdenes únicamente requiere la **Clave Pública** para cifrar datos. Incluso si este servicio fuera comprometido, un atacante no podría descifrar ninguna información de la base de datos.
   - Solo el microservicio interno protegido (o endpoint RBAC específico de lectura para roles autorizados) dispone del permiso de descifrado con la Clave Privada.

---

## 👥 3. Gestión de Identidad, Roles y Permisos (RBAC y ABAC)

En un taller profesional, la segregación de funciones (*Separation of Duties*) es crucial para la seguridad operativa y la privacidad de los clientes.

### 3.1. Matriz de Control de Acceso Basado en Roles (RBAC)

```mermaid
classDiagram
    class Usuario {
        +UUID id
        +String email
        +String rol
        +Boolean mfa_habilitado
    }
    class Mecanico {
        +verOrdenesTecnicas()
        +cambiarEstado()
        +anotarPiezasUsadas()
    }
    class Recepcion {
        +altaCliente()
        +crearOrden()
        +verDatosContacto()
        +emitirFactura()
    }
    class Administrador {
        +gestionarUsuarios()
        +verAuditorias()
        +modificarTarifas()
        +exportarMetricas()
    }
    Usuario <|-- Mecanico
    Usuario <|-- Recepcion
    Usuario <|-- Administrador
```

| Rol | Órdenes Técnicas (Bici, Avería, Estado) | Datos de Contacto (Teléfono, Email) | Gestión de Usuarios y Permisos | Facturación y Cobros |
| :--- | :---: | :---: | :---: | :---: |
| **👨‍🔧 Mecánico** | Lectura y Actualización | ❌ Sin Acceso (Protección PII) | ❌ Sin Acceso | ❌ Sin Acceso |
| **💼 Recepcionista** | Lectura y Creación | Lectura y Creación | ❌ Sin Acceso | Lectura y Cobro |
| **🔧 Jefe de Taller** | Lectura, Creación y Asignación | Lectura (Solo en incidencias) | ❌ Sin Acceso | Lectura de presupuestos |
| **📊 Administrador** | Acceso Total | Acceso Total | Acceso Total | Acceso Total |
| **🛡️ Auditor / DPO** | Solo Lectura de Auditoría | Solo Logs de Acceso | Auditoría de Permisos | Auditoría Contable |

### 3.2. Pistas de Auditoría Inmutables (Audit Logging)
- **Registro de Trazabilidad Forense**: Cualquier acceso, consulta o modificación sobre datos personales o cambios de estado debe quedar registrado en una tabla inmutable `audit_logs`:
  ```sql
  CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id UUID NOT NULL,
      rol VARCHAR(50) NOT NULL,
      accion VARCHAR(100) NOT NULL, -- ej: 'CLIENTE_DATOS_CONSULTADOS', 'ESTADO_CAMBIADO'
      recurso VARCHAR(50) NOT NULL,  -- ej: 'reparaciones', 'clientes'
      recurso_id VARCHAR(50) NOT NULL,
      detalles JSONB,               -- diff de valores anteriores y nuevos
      ip_origen INET NOT NULL,
      user_agent TEXT,
      fecha_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```

---

## 🧩 4. Estructuras de Acoplamiento y Desacoplamiento

Conforme el sistema crece, acoplar la lógica de negocio al framework HTTP o al motor de base de datos genera deuda técnica. Se proponen dos patrones clave:

### 4.1. Arquitectura Hexagonal / Clean Architecture (Puertos y Adaptadores)
Desacopla la lógica del dominio de la infraestructura:

```
src/
├── domain/                      # 1. Reglas de Negocio Puras (Sin dependencias externas)
│   ├── entities/
│   │   ├── Reparacion.js        # Entidad con métodos de transición de estado válidos
│   │   └── Cliente.js
│   └── value-objects/
│       ├── EstadoReparacion.js  # 'Pendiente' | 'En reparación' | 'Terminada'
│       └── CodigoCliente.js     # Validación de formato 'CLI-XXX'
├── application/                 # 2. Casos de Uso (Orquestación)
│   ├── use-cases/
│   │   ├── CrearReparacionUseCase.js
│   │   ├── CambiarEstadoReparacionUseCase.js
│   │   └── BuscarClientesUseCase.js
│   └── ports/                   # Interfaces / Contratos
│       ├── IReparacionesRepository.js
│       ├── IClientesRepository.js
│       └── INotificadorCliente.js
└── infrastructure/              # 3. Adaptadores y Tecnologías Concretas
    ├── database/
    │   ├── PostgresReparacionesRepository.js
    │   └── SQLiteReparacionesRepository.js
    ├── http/
    │   ├── controllers/
    │   └── middlewares/
    └── notifications/
        └── WhatsAppTwilioAdapter.js
```

**Ventaja principal:** Si mañana se decide cambiar SQLite por PostgreSQL, MongoDB o DynamoDB, **los casos de uso y la lógica del taller permanecen intactos**. Solo se implementa un nuevo adaptador.

---

### 4.2. Arquitectura Dirigida por Eventos (EDA - Event-Driven Architecture)
En lugar de que el endpoint HTTP bloquee al usuario esperando enviar correos, generar facturas o descontar stock, se emiten **Eventos de Dominio Asíncronos** mediante un gestor de mensajería empresarial (**RabbitMQ**):

```mermaid
sequenceDiagram
    actor Usuario as Mecánico
    participant API as API Backend
    participant DB as Base de Datos
    participant Rabbit as RabbitMQ (Exchange: taller.eventos)
    participant WorkerNotif as Microservicio: Notificaciones
    participant WorkerStock as Worker: Inventario

    Usuario->>API: PATCH /api/reparaciones/42/estado {"estado": "Terminada"}
    API->>DB: UPDATE reparacion SET estado = 'Terminada'
    API->>Rabbit: Publicar evento 'orden.terminada'
    API-->>Usuario: 200 OK (Respuesta en < 15ms)

    par Consumo Desacoplado
        Rabbit->>WorkerNotif: Enrutado a 'cola.notificaciones.sms' y 'email'
        WorkerNotif->>WorkerNotif: Envío de SMS y Email automático al cliente
    and
        Rabbit->>WorkerStock: Enrutado a 'cola.inventario'
        WorkerStock->>WorkerStock: Ajuste automático de stock de piezas usadas
    end
```

---

### 4.3. Microservicio de Notificaciones Automáticas (SMS y Correo) con RabbitMQ

Uno de los mayores cuellos de botella en sistemas de taller radica en acoplar el envío de avisos a los clientes dentro del ciclo de vida HTTP de la aplicación. Integrar un **microservicio de notificaciones dedicado y desacoplado mediante RabbitMQ** aporta resiliencia, alta disponibilidad y una experiencia de usuario inmediata.

#### 1. ¿Por qué desacoplar con RabbitMQ?
- **Tolerancia a fallos de proveedores externos**: Si el operador de SMS (Twilio, AWS SNS) o de correo (SendGrid, AWS SES) sufre latencias, límites de tasa (*rate limits*) o una caída temporal, **la orden del taller se guarda de inmediato** y el mecánico no experimenta bloqueos en su pantalla.
- **Escalabilidad horizontal independiente**: El microservicio de notificaciones se ejecuta en sus propios contenedores y puede escalar de forma aislada según el volumen de alertas, sin consumir memoria ni CPU del servidor central.
- **Garantía de entrega (*At-Least-Once Delivery*)**: Los mensajes persisten en disco dentro de RabbitMQ hasta que el microservicio confirma su procesamiento exitoso (`channel.ack()`).

#### 2. Topología de RabbitMQ propuesta

```mermaid
flowchart TD
    Backend["🏭 Backend Principal (Publisher)"]
    Exchange["🔄 Topic Exchange: 'taller.eventos'"]
    
    QueueSMS["📥 Cola: 'cola.notificaciones.sms'"]
    QueueEmail["📥 Cola: 'cola.notificaciones.email'"]
    DLQ["💀 Cola Muerta: 'cola.notificaciones.dlq' (Dead Letter Queue)"]

    ServiceSMS["📱 Notifier Worker (SMS / Twilio)"]
    ServiceEmail["✉️ Notifier Worker (Email / SendGrid)"]
    AlertSystem["🚨 Sistema de Alertas / Admin Ops"]

    Backend -- "Publish event" --> Exchange
    Exchange -- "Binding: orden.*" --> QueueSMS
    Exchange -- "Binding: orden.*" --> QueueEmail

    QueueSMS --> ServiceSMS
    QueueEmail --> ServiceEmail

    ServiceSMS -- "Fallo tras 3 reintentos" --> DLQ
    ServiceEmail -- "Fallo tras 3 reintentos" --> DLQ
    DLQ --> AlertSystem
```

- **Exchange**: `taller.eventos` (Tipo `topic`).
- **Routing Keys**:
  - `orden.creada`: Emite acuse de recibo de la bicicleta al cliente con el código de seguimiento.
  - `orden.estado_actualizado`: Aviso cuando la bicicleta entra activamente en el caballete (*En reparación*).
  - `orden.terminada`: Aviso prioritario de entrega (*"¡Tu bicicleta está lista para recoger!"*) con el importe y enlace al presupuesto/factura.

#### 3. Estructura del Payload del Evento (JSON Estandarizado)
El backend publica un mensaje ligero e inmutable:
```json
{
  "evento_id": "evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "tipo_evento": "orden.terminada",
  "timestamp": "2026-10-15T10:30:00Z",
  "version": "1.0",
  "data": {
    "orden_id": 42,
    "codigo_cliente": "CLI-001",
    "cliente": {
      "nombre": "Cliente Ficticio Demo",
      "telefono": "+34555010001",
      "email": "cliente.demo@ejemplo.com",
      "consentimiento_notificaciones": true
    },
    "reparacion": {
      "descripcion_bici": "Trek Marlin 7 - Azul (Montaña)",
      "problema": "Freno de disco trasero purgado y pastillas sustituidas",
      "estado": "Terminada",
      "importe_total": "35.50 €",
      "enlace_seguimiento": "https://taller.ejemplo.com/seguimiento/CLI-001?token=sec_abc123"
    }
  }
}
```

#### 4. Canales de Notificación en el Microservicio
1. **Canal SMS (Twilio / MessageBird / AWS SNS)**:
   - Formato corto y de alta tasa de apertura (98% en los primeros 3 minutos):
     > *"BiciTaller: ¡Tu Trek Marlin 7 ya está terminada y lista para recoger! Total: 35.50€. Consulta detalles: https://taller.ejemplo.com/s/CLI-001"*
2. **Canal Correo Electrónico (SendGrid / AWS SES / Resend)**:
   - Plantillas HTML responsive (utilizando motores como `MJML` o `Handlebars`):
     - Resumen técnico de los trabajos realizados y recambios empleados.
     - Factura o presupuesto adjunto en PDF generado automáticamente.
     - Botón de valoración del servicio y enlace al portal del taller.

#### 5. Resiliencia, Idempotencia y Dead Letter Queue (DLQ)
- **Control de Idempotencia con Redis**: Cada evento incluye un `evento_id` único. Antes de disparar el SMS o correo, el worker consulta en Redis `SETNX notif:evt_9b1deb4d...`. Si la clave ya existe, el mensaje se descarta para evitar que un cliente reciba el mismo aviso dos veces por un reenvío de red.
- **Estrategia de Reintentos Exponenciales (*Exponential Backoff*)**:
  - Si el proveedor de correo o SMS responde con error de red (503 / Timeout), el worker rechaza el mensaje (`nack`) y RabbitMQ lo encola en un intercambio de reintento temporal con pausas crecientes (30s, 2m, 10m).
  - Si tras 3 intentos el envío sigue fallando, el mensaje se redirige a `cola.notificaciones.dlq` (*Dead Letter Queue*) y se genera una alerta en el panel de administración para que recepción pueda contactar manualmente por teléfono.

#### 6. Integración en Docker (`docker-compose.yml`)
En la evolución de la infraestructura, se incorporaría RabbitMQ y el nuevo microservicio de forma directa:

```yaml
services:
  # Broker de Mensajería
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: taller-rabbitmq
    ports:
      - "5672:5672"    # Protocolo AMQP para los servicios
      - "15672:15672"  # Dashboard web de monitorización y colas
    environment:
      RABBITMQ_DEFAULT_USER: taller_user
      RABBITMQ_DEFAULT_PASS: taller_secure_pass
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  # Microservicio desacoplado de Notificaciones
  notifications-service:
    build:
      context: ./notifications-service
      dockerfile: Dockerfile
    container_name: taller-notifications
    environment:
      RABBITMQ_URL: amqp://taller_user:taller_secure_pass@rabbitmq:5672
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
    depends_on:
      - rabbitmq
    restart: unless-stopped
```

---

## 💾 5. Cuidado, Calidad y Escalabilidad de los Datos

### 5.1. Transición de SQLite a PostgreSQL en Producción
- **SQLite**: Excepcional para prototipos, CLI y entornos integrados (cero configuración y archivo local).
- **PostgreSQL**: Estándar para entornos concurrentes con múltiples mecánicos y recepcionistas conectados simultáneamente:
  - Transacciones con nivel de aislamiento serializable.
  - Conexiones agrupadas (*Connection Pooling* con PgBouncer).
  - Soporte de tipo nativo `JSONB` para almacenar inspecciones técnicas variables (desgaste de cadena en %, presión de amortiguador, etc.) sin romper el esquema relacional.
  - Réplicas de Solo Lectura (*Read Replicas*) para descargar el servidor principal de consultas masivas de reportes.

### 5.2. Normalización de Entidades: Catálogo de Bicicletas y Desacoplamiento (Modelo "Automoción")

En el prototipo funcional actual, la bicicleta se describe mediante un campo de texto libre (`descripcion_bici TEXT` en `reparaciones`). Si bien esto agiliza las pruebas iniciales, en un sistema de producción genera **inconsistencias graves**:
- **Duplicidad y Errores Tipográficos**: Un mismo modelo puede registrarse como *"Trek Marlin 7"*, *"Trek Marlin7"* o *"Marlin 7 Azul"*, imposibilitando agregaciones y estadísticas de averías.
- **Pérdida del Historial Técnico del Vehículo**: Si un cliente acude 4 veces al taller con la misma bicicleta, no existe forma fiable de consultar su historial acumulado de mantenimiento, kilometraje o piezas sustituidas.

#### 5.2.1. Modelo Relacional Normalizado (Tercera Forma Normal - 3NF)
Inspirado en el estándar de los talleres de automoción (Marcas -> Modelos -> Vehículo del Cliente con Bastidor):

```mermaid
erDiagram
    MARCA ||--o{ MODELO : "fabrica"
    MODELO ||--o{ BICICLETA : "clasifica"
    CLIENTE ||--o{ BICICLETA : "es propietario de"
    BICICLETA ||--o{ REPARACION : "recibe intervenciones"

    MARCA {
        int id PK
        string nombre "ej: Trek, Orbea, Specialized"
        string pais_origen
    }

    MODELO {
        int id PK
        int marca_id FK
        string nombre "ej: Marlin 7 Gen 3, Oiz M-Team"
        string categoria "MTB | Carretera | Gravel | Urbana | e-Bike"
        int anio_fabricacion
    }

    BICICLETA {
        int id PK
        int cliente_id FK
        int modelo_id FK
        string numero_serie "Único (N.º Bastidor troquelado)"
        string color
        string talla_cuadro "S | M | L | XL"
        string extras_equipamiento
        datetime created_at
    }

    CLIENTE {
        int id PK
        string codigo_cliente UK "CLI-XXX"
        string nombre
        string envelope_datos_privados
    }

    REPARACION {
        int id PK
        int bicicleta_id FK "Relación N a 1 con la bicicleta"
        int cliente_id FK
        string problema
        string estado "Pendiente | En reparación | Terminada"
        datetime fecha_ingreso
        datetime fecha_salida
    }
```

#### 5.2.2. Esquema DDL en SQL y Ventajas Operativas
```sql
-- 1. Catálogo maestro de marcas
CREATE TABLE marcas_bicis (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

-- 2. Catálogo maestro de modelos predeterminados
CREATE TABLE modelos_bicis (
    id SERIAL PRIMARY KEY,
    marca_id INT NOT NULL REFERENCES marcas_bicis(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK(categoria IN ('MTB', 'Carretera', 'Gravel', 'Urbana', 'e-Bike', 'Infantil')),
    anio INT,
    CONSTRAINT uq_marca_modelo UNIQUE (marca_id, nombre, anio)
);

-- 3. Bicicletas registradas propiedad de los clientes
CREATE TABLE bicicletas (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    modelo_id INT NOT NULL REFERENCES modelos_bicis(id) ON DELETE RESTRICT,
    numero_serie VARCHAR(100) UNIQUE, -- Bastidor físico (evita robo o falsificación)
    color VARCHAR(50),
    talla VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de reparaciones desacoplada y con integridad referencial
CREATE TABLE reparaciones (
    id SERIAL PRIMARY KEY,
    bicicleta_id INT NOT NULL REFERENCES bicicletas(id) ON DELETE RESTRICT,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    problema TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL CHECK(estado IN ('Pendiente', 'En reparación', 'Terminada')),
    presupuesto_estimado NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reparaciones_bicicleta ON reparaciones(bicicleta_id);
CREATE INDEX idx_reparaciones_estado ON reparaciones(estado);
```

#### 5.2.3. Beneficios Inmediatos de Esta Estructura:
1. **Historial Clínico de la Bicicleta (*Service Record*)**: Permite al mecánico consultar en pantalla: *"Esta Trek Marlin ya cambió pastillas de freno hace 3 meses y la cadena tiene 1.200 km"*.
2. **Autocompletado Predictivo en la UI**: En la pantalla de recepción, el recepcionista selecciona la marca en un desplegable, lo que filtra reactivamente los modelos disponibles, agilizando el alta en menos de 10 segundos.
3. **Analítica de Calidad y Defectos**: Permite al taller generar informes como *"¿Qué modelos de bicicletas tienen mayor tasa de avería en amortiguación?"* o avisar proactivamente de campañas de retirada (*recall*) de fabricantes.
4. **Prevención de Fraude y Bicicletas Robadas**: El número de serie o bastidor troquelado (`numero_serie`) actúa como identificador inequívoco entre clientes.

### 5.3. Borrado Lógico (*Soft Deletes*) y Protección contra Pérdidas
- Sustituir `DELETE FROM reparaciones WHERE id = ?` por:
  ```sql
  UPDATE reparaciones SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?;
  ```
- **Justificación**: En un taller, una orden no debe destruirse físicamente, ya que puede ser necesaria para resolver disputas de garantía, reclamaciones de seguros o auditorías de hacienda.

### 5.4. Política de Retención y Anonimización (Derecho al Olvido RGPD)
- Proceso cron automatizado que detecte clientes sin actividad en más de 5 años.
- Los datos personales en `clientes` se anonimizan (`nombre = 'ANONIMIZADO'`, `telefono = NULL`), preservando la orden en `reparaciones` para mantener las estadísticas contables íntegras.

---

## 📈 6. Observabilidad, Resiliencia y DevOps

Un sistema no está completo sin herramientas para detectar fallos antes de que los reporten los clientes:

```mermaid
graph LR
    App["Backend Express / Node"] --> Metrics["📊 Prometheus / Grafana<br/>(Latencias P95, RPS, Códigos HTTP)"]
    App --> Logs["📝 Loki / ELK<br/>(Logs estructurados en formato JSON)"]
    App --> Traces["🔍 OpenTelemetry / Jaeger<br/>(Tiempos de queries SQL y endpoints)"]
```

1. **Logging Estructurado en JSON (`Pino` o `Winston`)**:
   - Cada log incluye `traceId`, `timestamp`, `level`, `userId` y `durationMs`. Facilita la ingesta automática en Elasticsearch, Datadog o Grafana Loki.
2. **Healthchecks Avanzados (Liveness y Readiness)**:
   - `/api/health/liveness`: Verifica si el proceso de Node está vivo.
   - `/api/health/readiness`: Verifica si la base de datos responde y hay espacio en disco antes de admitir tráfico de balanceadores.
3. **Pipeline CI/CD Automatizado (GitHub Actions)**:
   - Fase 1: Linting estricto (`ESLint`), chequeo de tipos (`TypeScript` / `JSDoc`).
   - Fase 2: Tests unitarios y de integración sobre base de datos efímera.
   - Fase 3: Análisis estático de seguridad (SAST) y escaneo de vulnerabilidades en imágenes Docker.
   - Fase 4: Despliegue continuo con estrategia Blue/Green o Canary (sin tiempo de inactividad para el taller).

---

## 🗺️ 7. Roadmap Priorizado de Implementación

Para planificar la evolución de forma iterativa y con retorno de inversión inmediato:

```mermaid
gantt
    title Roadmap de Evolución Técnica del Taller
    dateFormat  YYYY-MM-DD
    section Fase 1: Fundación y Seguridad
    Migración a PostgreSQL & Prisma        :a1, 2026-11-01, 14d
    Autenticación JWT, Cookies y RBAC      :a2, after a1, 14d
    Hardening Docker y Helmet              :a3, after a2, 7d
    section Fase 2: Desacoplamiento y Microservicios
    Arquitectura Hexagonal en backend      :b1, after a3, 14d
    Microservicio Notificaciones (RabbitMQ):b2, after b1, 12d
    Módulo de Control de Stock y Piezas    :b3, after b2, 14d
    section Fase 3: Experiencia y Observabilidad
    Portal Web público para clientes       :c1, after b3, 21d
    Métricas con Prometheus & Grafana      :c2, after c1, 14d
```

| Fase | Iniciativa Clave | Esfuerzo | Impacto |
| :--- | :--- | :---: | :---: |
| **Fase 1** *(Inmediata)* | Autenticación JWT, RBAC de 3 roles y migración a PostgreSQL | Medio | **Crítico** |
| **Fase 1** *(Inmediata)* | Rate Limiting, Helmet y borrado lógico (*Soft Deletes*) | Bajo | **Alto** |
| **Fase 2** *(Medio Plazo)* | Arquitectura Hexagonal y Microservicio de Notificaciones con RabbitMQ (SMS y Email) | Medio | **Muy Alto** |
| **Fase 2** *(Medio Plazo)* | Módulo de gestión de inventario y repuestos asociados a la reparación | Medio | **Alto** |
| **Fase 3** *(Largo Plazo)* | Portal público de seguimiento para el cliente mediante código o QR | Medio | **Alto** |
| **Fase 3** *(Largo Plazo)* | Observabilidad completa (OpenTelemetry + Prometheus + Grafana) | Medio | **Medio** |

---

## 📌 Conclusión

Este roadmap demuestra cómo un prototipo funcional bien estructurado puede transformarse, mediante decisiones meditadas de ingeniería y buenas prácticas, en una **solución de grado corporativo**: segura frente a amenazas modernas, respetuosa con la privacidad de los usuarios, altamente desacoplada para evolucionar sin fricción y preparada para escalar el negocio del taller de bicicletas.
