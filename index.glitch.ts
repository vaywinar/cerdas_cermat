import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./glitch";

// Log environment for debugging
console.log("====== GLITCH DEPLOYMENT ======");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("PROJECT_DOMAIN:", process.env.PROJECT_DOMAIN);
console.log("===============================");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for Glitch
app.use((req, res, next) => {
  // Allow requests from any origin in development
  if (process.env.NODE_ENV !== 'production') {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  }
  next();
});

// Logging middleware
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

// Health check endpoint for Glitch
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

(async () => {
  try {
    console.log("Initializing server...");
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // Setup either static serving or development server
    if (process.env.NODE_ENV !== 'production') {
      console.log("Starting in development mode");
      await setupVite(app, server);
    } else {
      console.log("Starting in production mode");
      serveStatic(app);
    }

    // Get port from environment or fallback to 3000
    // Glitch sets process.env.PORT
    const port = process.env.PORT || 3000;
    
    server.listen({
      port,
      host: "0.0.0.0", // Important for Glitch
    }, () => {
      log(`Server running on port ${port}`);
      if (process.env.PROJECT_DOMAIN) {
        console.log(`App is live at: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
      } else {
        console.log(`App is running locally - open http://localhost:${port}`);
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();