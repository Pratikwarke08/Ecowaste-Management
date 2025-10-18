import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import fs from "fs";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({

  // ✅ Always root for local + Render hosting
  // (no subfolder like "/Ecowaste/")
  base: "/",

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  build: {
    chunkSizeWarningLimit: 1000, // increases warning limit
  },

  server: {
    https: {
      key: fs.existsSync("localhost-key.pem") 
        ? fs.readFileSync("localhost-key.pem") 
        : undefined,
      cert: fs.existsSync("localhost-cert.pem") 
        ? fs.readFileSync("localhost-cert.pem") 
        : undefined,
    },
    host: "0.0.0.0", // allows access from LAN/mobile
    port: 5173,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));