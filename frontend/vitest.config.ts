import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      // CSS modules get their real class names, as in Quill Medical's
      // tests, so a test can check which class a component applied.
      css: true,
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
    },
  }),
);
