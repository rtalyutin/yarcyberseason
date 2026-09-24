import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createWebMcpDataVersion } from './scripts/data-version.mjs';

// Version the complete public snapshot and the code that interprets it.
const dataVersion = createWebMcpDataVersion();
const buildGeneratedAt = process.env.YCS_BUILD_GENERATED_AT || new Date().toISOString();

export default defineConfig({
  define: {
    __YCS_DATA_VERSION__: JSON.stringify(dataVersion),
    __YCS_BUILD_GENERATED_AT__: JSON.stringify(buildGeneratedAt),
  },
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
