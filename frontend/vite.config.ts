/**
 * Vite configuration for the CostForge React frontend.
 *
 * In development:
 *   - The dev server runs on PORT (default 5000) with HMR.
 *   - Any request to /api/* is proxied to the Django backend on
 *     http://localhost:8000/api/* so the React app can call the REST API
 *     without CORS or hard-coded URLs.
 *
 * In production:
 *   - `npm run build` produces a static bundle in ./dist
 *   - Django serves that bundle (via WhiteNoise) AND the /api routes from
 *     the same process, so there is nothing to proxy.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const PORT = Number(process.env.PORT) || 5000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // `@/foo` resolves to `frontend/src/foo` — same shorthand the
  // shadcn/ui components expect.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: PORT,
    strictPort: true,
    // Replit's preview pane is a different host, so allow any origin.
    allowedHosts: true,
    proxy: {
      // All API traffic goes to the Django REST backend during development.
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: PORT,
    allowedHosts: true,
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
