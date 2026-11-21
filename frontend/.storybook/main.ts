import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook for Juttu's components, on port 6106 (`JUTTU_STORYBOOK_PORT`).
 *
 * `@storybook/react-vite` loads the project's own `vite.config.ts`, so the
 * `@/` alias and the PostCSS set-up apply here exactly as they do to the app.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: ["../public"],
  core: {
    // Storybook sends anonymous usage data unless told not to.
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
