import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

// Fingerprint the published data AND shared interpretation, never GitHub main
// at runtime. The same build always reports the same content version.
const contentFiles = [
  ...readdirSync(new URL('./src/data/tournaments/', import.meta.url)).filter((name) => name.endsWith('.json')).map((name) => `src/data/tournaments/${name}`),
  'src/data/tournaments/index.js', 'src/data/teams.json', 'src/data/community.js', 'src/lib/community.js',
].sort();
const contentHash = createHash('sha256');
for (const path of contentFiles) contentHash.update(path).update('\0').update(readFileSync(new URL(path, import.meta.url))).update('\0');
const dataVersion = `sha256:${contentHash.digest('hex')}`;

export default defineConfig({
  define: { __YCS_DATA_VERSION__: JSON.stringify(dataVersion) },
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
