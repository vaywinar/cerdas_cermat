import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { createServer as createViteServer, createLogger } from "vite";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log("Setting up Vite in development mode on Glitch");
  
  const serverOptions = {
    middlewareMode: true as const,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        console.error("Vite error:", msg);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Adjust path to find index.html - this is important for Glitch
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      console.log("Looking for template at:", clientTemplate);
      
      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Error processing HTML:", e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log("Environment:", process.env.NODE_ENV, "Running in production mode:", isProduction);
  
  if (!isProduction) {
    console.log("Skipping static file serving in development mode");
    return;
  }
  
  // Adjust paths for Glitch - they might use different directory structures
  const possiblePaths = [
    path.resolve(process.cwd(), "dist", "client"),
    path.resolve(process.cwd(), "dist"),
    path.resolve(process.cwd(), "build", "client"),
    path.resolve(process.cwd(), "build")
  ];
  
  let distPath = null;
  
  // Find the first path that exists
  for (const p of possiblePaths) {
    console.log("Checking for build directory at:", p);
    if (fs.existsSync(p)) {
      distPath = p;
      console.log("Found build directory at:", distPath);
      break;
    }
  }
  
  if (!distPath) {
    console.warn("Could not find any build directory in known locations");
    console.warn("Please ensure you ran the build step correctly");
    // Instead of throwing, we'll just bail out
    return;
  }

  // Serve static files
  app.use(express.static(distPath));
  console.log("Serving static files from:", distPath);

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    console.log("Fallback to:", indexPath);
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found - build not completed correctly");
    }
  });
}