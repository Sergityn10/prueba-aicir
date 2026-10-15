import { app } from "./app.js";
import { initDatabase } from "./config/database.js";

const PORT = process.env.PORT || 3001;

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
