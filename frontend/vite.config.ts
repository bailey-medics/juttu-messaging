import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** The port the Vite dev server listens on. */
const port = Number(process.env.JUTTU_FRONTEND_PORT ?? 5273);

export default defineConfig({
  plugins: [
    react(),
    // The service worker, src/sw.ts, built into /sw.js with the list of files
    // to precache written into it. src/pwa/registerServiceWorker.ts registers
    // it, so the plugin injects nothing into the page.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      // public/manifest.webmanifest is the manifest, written by hand.
      manifest: false,
      injectManifest: {
        // index.html is left out: a page load always tries the network
        // first, and falls back to offline.html.
        globPatterns: [
          "assets/*.{js,css,woff2}",
          "*.png",
          "*.svg",
          "offline.html",
          "manifest.webmanifest",
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  // Reads the `@/` alias from tsconfig.app.json, so the build, the tests and
  // Storybook (which loads this file) all resolve it the same way.
  resolve: { tsconfigPaths: true },
  server: {
    // 0.0.0.0 so the dev server is reachable from outside its container.
    host: true,
    port,
    strictPort: true,
    // Proxy the API rather than calling the backend from another origin.
    // That mirrors deployment, where one origin serves the app and the API,
    // so cookies behave in development as they will for real. `JUTTU_API`
    // points the proxy somewhere else, such as the backend in its container.
    proxy: {
      "/api": {
        target: process.env.JUTTU_API ?? "http://localhost:8100",
        changeOrigin: false,
      },
    },
  },
});
