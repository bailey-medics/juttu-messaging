import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** The port the Vite dev server listens on. */
const port = Number(process.env.JUTTU_FRONTEND_PORT ?? 5273);

export default defineConfig({
  plugins: [react()],
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
