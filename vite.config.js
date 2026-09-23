import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
