import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy 3D vendor libs in their own chunk — only loaded when needed
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          // React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI primitives
          "vendor-radix": ["radix-ui"],
          // State & data
          "vendor-state": ["zustand", "@tanstack/react-query"],
        },
      },
    },
  },
  // Allow importing .stl files as URLs
  assetsInclude: ["**/*.stl"],
});
