# 📬 Plantilla de Correo de Entrega: Caso Práctico Taller de Bicicletas
> **Destinatario:** Equipo de Selección / Mentores del Programa PRET/TR3S60 en **aicir**  
> **Remitente:** Sergio  
> **Asunto:** Entrega Caso Práctico PRET/TR3S60 — Gestión de Reparaciones de Taller de Bicicletas | Sergio

---

### 📄 Cuerpo del Correo (Listo para Copiar y Enviar)

**Estimado equipo de selección de aicir,**

Espero que os encontréis muy bien.

En primer lugar, quiero agradeceros la oportunidad de participar en el proceso de selección para las prácticas del programa **PRET/TR3S60**. El caso práctico planteado me ha parecido un ejercicio excelente para demostrar no solo habilidades de desarrollo de software, sino también criterio a la hora de diseñar interfaces intuitivas, estructurar arquitecturas desacopladas y, especialmente, **cuidar el dato y la privacidad de los usuarios**.

A continuación, os comparto el resumen de la solución desarrollada, las decisiones técnicas adoptadas y la propuesta de mejoras de ingeniería para su evolución a un entorno empresarial:

---

### 🚀 1. Resumen de la Solución Desarrollada (Prototipo Funcional)

He construido una aplicación web *Full-Stack* completa, funcional y contenerizada:

* **Frontend (React 19 + CSS Puro Moderno):**
  * **Tablero Operativo Kanban + Alternador a Tabla:** Visualización ágil de las bicicletas distribuidas en 3 columnas (*Pendiente*, *En reparación*, *Terminada*) con transiciones de estado en 1 clic y actualización optimista.
  * **Alta Eficiente de Reparaciones con Pestañas (`/new`):** Buscador predictivo en tiempo real de clientes existentes (`CLI-XXX`) y formulario de alta rápida de nuevos clientes en la misma pantalla sin perder el contexto.
  * **Paginación Defensiva Sincronizada en la URL (`useSearchParams`):** Navegación fluida por páginas que evita la saturación del cliente y del servidor, permitiendo recargar o compartir la URL (`/?page=2&estado=Pendiente`) manteniendo el estado exacto.
  * **Catálogo de averías rápidas:** *Chips* interactivos para rellenar averías comunes en 1 clic.
  * **Diseño Limpio sin Librerías Externas:** Maquetación moderna utilizando variables semánticas CSS, Grid y Flexbox responsive.

* **Backend (Node.js + Express + `node:sqlite` Nativo):**
  * **Persistencia Relacional Real:** Base de datos local en disco con integridad referencial y restricciones a nivel de motor (`CHECK`, `NOT NULL`).
  * **Cero Dependencias Nativas de Compilación:** Uso del módulo nativo de Node.js para SQLite, asegurando total compatibilidad y portabilidad multiplataforma.
  * **Consultas Parametrizadas y Validación Defensiva:** Prevención absoluta de inyecciones SQL y sanitización rigurosa de entradas.
  * **Paginación en Servidor:** Consultas optimizadas con `LIMIT` y `OFFSET`.

* **Privacidad y Datos Sintéticos (Cumplimiento RGPD):**
  * Cumpliendo escrupulosamente con el requerimiento, se han utilizado exclusivamente **datos 100% ficticios** tanto en semillas como en tests (`CLI-001`, teléfonos ficticios `555-XXXXXX`).
  * Modal informativo de privacidad accesible en la barra lateral del frontend.

* **Despliegue con Docker:**
  * Configuración lista para producción con `docker-compose.yml`, construcciones multi-etapa optimizadas con Nginx y Node 22-alpine.

---

### 💡 2. Propuestas Clave de Mejora y Evolución Empresarial

En el documento adjunto en la raíz del proyecto ([`PROPUESTA_MEJORAS_Y_ARQUITECTURA.md`](./PROPUESTA_MEJORAS_Y_ARQUITECTURA.md)), he desarrollado una estrategia exhaustiva de ingeniería de software. Destaco especialmente las siguientes mejoras:

#### 🚲 A. Normalización del Catálogo de Bicicletas (Modelo "Automoción")
Actualmente la bicicleta se indica mediante un campo de texto libre (`descripcion_bici`). Para un sistema en producción, propongo estructurarlo exactamente como en los talleres de coches:
* **Separación Relacional:** `marcas_bicis` (Trek, Orbea...) ➔ `modelos_bicis` (Marlin 7, Oiz...) ➔ `bicicletas` (vinculada al cliente con su número de serie/bastidor físico) ➔ `reparaciones` (`bicicleta_id FK`).
* **Beneficios Inmediatos:**
  1. **Historial Clínico del Vehículo:** Consultar todas las reparaciones e intervenciones previas de una bicicleta concreta a lo largo de los años.
  2. **Cero Duplicidades:** Evita incoherencias por errores tipográficos (*"Trek Marlin"* vs *"Marlin 7"*).
  3. **Analítica de Calidad:** Estadísticas de averías frecuentes por modelo y avisos de revisiones preventivas.

#### 🔐 B. Ciberseguridad y Cifrado de Datos Privados con RSA (Cifrado Híbrido / Envelope Encryption)
Para proteger los datos personales (teléfono, email, facturación):
* Se aplica **Envelope Encryption** (el estándar de AWS KMS y HashiCorp Vault): los datos se cifran con una clave efímera de 256 bits (`AES-256-GCM`), y dicha clave se cifra con la clave pública **RSA-4096** (`RSA-OAEP-SHA256`).
* **Aislamiento de Claves:** La clave privada se custodia en directorio protegido (`certs/` con permisos `600` e ignorado en Git), con hoja de ruta para delegar en **KMS/HSM** en la nube donde la clave privada nunca abandona el hardware de seguridad.
* *He incluido una prueba ejecutable en el backend:* `npm run demo:crypto`.

#### 📨 C. Microservicio Asíncrono de Notificaciones con RabbitMQ (SMS y Email)
* Desacoplamiento de la API principal mediante arquitectura orientada a eventos (*Event-Driven Architecture*).
* Al pasar una orden a *«Terminada»*, el backend publica un evento inmutable en RabbitMQ (`taller.eventos`).
* Un microservicio independiente consume el evento y envía automáticamente el SMS (vía Twilio) y el correo electrónico con la factura en PDF (vía SendGrid/SES).
* Incluye control de idempotencia con Redis y cola de mensajes fallidos (*Dead Letter Queue* - DLQ) con reintentos exponenciales.

#### 👥 D. Segregación de Funciones (RBAC) y Auditoría Forense
* Los mecánicos solo visualizan información técnica de la bicicleta y la avería.
* Solo el personal de recepción o administración puede descifrar y consultar los datos de contacto.
* Registro inmutable de trazabilidad (`audit_logs`) para cumplir con normativas de protección de datos.

---

### 🛠️ 3. Instrucciones Rápidas para Ejecutar el Proyecto

El repositorio está listo para ser probado de inmediato:

#### Opción 1: Con Docker (Recomendado, un solo comando)
```bash
docker compose up --build
```
* **Frontend:** http://localhost:8080
* **API Backend:** http://localhost:3001/api/reparaciones

#### Opción 2: Ejecución Local en Node.js
```bash
# Terminal 1: Backend
cd backend
npm install
npm start          # Se inicializa en http://localhost:3001

# Terminal 2: Frontend
cd frontend-bicis
npm install
npm run dev        # Se inicializa en http://localhost:5173
```

#### Tests Automatizados y Demostración Criptográfica:
```bash
cd backend
npm test           # Smoke tests del backend y persistencia SQLite
npm run demo:crypto # Demostración interactiva del cifrado Envelope con RSA y AES
```

---

Quedo a vuestra total disposición para comentar cualquier detalle de la implementación, profundizar en las decisiones de diseño o realizar una demostración técnica en directo.

Afronto este proceso con muchísima ilusión y con el convencimiento de que el programa **PRET/TR3S60 en aicir** es el entorno idóneo para continuar aprendiendo y aportando valor al desarrollo de productos tecnológicos de impacto.

Muchas gracias por vuestro tiempo y consideración.

Un cordial saludo,

**Sergio**  
[Tu Enlace a GitHub / LinkedIn]  
[Tu Teléfono de Contacto]  
[Tu Correo Electrónico]  
