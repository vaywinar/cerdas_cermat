import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite.local"; // Import dari vite.local.ts

// Tambahkan logging untuk melihat environment
console.log("Starting server in environment:", process.env.NODE_ENV || "undefined");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("Registering routes...");
    const server = await registerRoutes(app);
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // Periksa environment dengan lebih jelas
    const environment = process.env.NODE_ENV;
    console.log("Environment for Vite setup:", environment);
    
    if (environment === "development") {
      console.log("Setting up Vite for development");
      await setupVite(app, server);
    } else {
      console.log("Setting up static file serving for production");
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0", // Menggunakan 0.0.0.0 agar dapat diakses dari luar
    }, () => {
      log(`Server berjalan di port ${port}`);
      console.log(`========================================`);
      console.log(`🚀 Aplikasi Cerdas Cermat dapat diakses di: http://localhost:${port}`);
      console.log(`📱 Buka di perangkat lain dengan: http://<alamat-ip-komputer>:${port}`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
})();