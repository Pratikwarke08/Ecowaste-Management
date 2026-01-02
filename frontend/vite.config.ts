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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-slot', '@radix-ui/react-tooltip'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    minify: 'esbuild', // Faster than terser
    // Console logs will be removed in production via esbuild
  },

  server: {
    // Disable HTTPS in development to avoid macOS AirPlay conflicts
    // Use HTTP only - the proxy will handle backend communication
    host: "0.0.0.0", // allows access from LAN/mobile
    port: 5173,
    allowedHosts: true,


    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:3000",

        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          if (mode === 'development') {
            proxy.on('error', (err, _req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url);
            });
          }
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));