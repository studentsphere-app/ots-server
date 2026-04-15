import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "logo.png",
        "logo-short.png",
        "app-icon.png",
        "app-icon-192.png",
      ],
      manifest: {
        name: "Open Timetable Scraper",
        short_name: "OTS",
        description: "L'agrégateur d'emploi du temps Open-Source",
        theme_color: "#36B6D4",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "app-icon.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "app-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the Express backend
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
});
