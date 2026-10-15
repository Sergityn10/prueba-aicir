import express from "express";
import cors from "cors";
import { initDatabase } from "./config/database.js";
import { ReparacionesController } from "./controllers/reparaciones.controller.js";
import { ClientesController } from "./controllers/clientes.controller.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Log de peticiones entrantes
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check para Docker y monitorización
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "taller-bicis-backend",
    timestamp: new Date().toISOString()
  });
});

// Rutas de clientes (búsqueda y alta en taller)
app.get("/api/clientes", ClientesController.getAll);
app.post("/api/clientes", ClientesController.create);

// Rutas de la API de reparaciones
// Nota: /stats debe declararse antes de /:id para evitar colisiones de rutas
app.get("/api/reparaciones/stats", ReparacionesController.getStats);
app.get("/api/reparaciones", ReparacionesController.getAll);
app.get("/api/reparaciones/:id", ReparacionesController.getById);
app.post("/api/reparaciones", ReparacionesController.create);
app.patch("/api/reparaciones/:id/estado", ReparacionesController.updateEstado);
app.delete("/api/reparaciones/:id", ReparacionesController.delete);

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Inicialización de la base de datos y arranque del servidor
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🚀 Servidor backend del taller de bicicletas activo`);
      console.log(`📡 URL API: http://localhost:${PORT}/api/reparaciones`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error("❌ Fallo crítico al iniciar el backend:", error);
    process.exit(1);
  }
}

startServer();
