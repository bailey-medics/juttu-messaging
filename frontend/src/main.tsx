/**
 * The app's entry point: the install prompt and the service worker, then the
 * theme and the router.
 */

import "@fontsource-variable/atkinson-hyperlegible-next";
import "@mantine/core/styles.css";
import "@/styles/typography.css";
import "@/styles/dark-overrides.css";
import "@/styles/touch-targets.css";
import "@/styles/disabled-controls.css";

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { installPromptCapture } from "@/pwa/installPrompt";
import { registerServiceWorker } from "@/pwa/registerServiceWorker";
import { routes } from "@/routes";
import { cssVariablesResolver, theme } from "@/theme";

// The browser offers an install once, often before React has mounted, and the
// offer is lost unless something is already listening.
installPromptCapture.wire(window);

registerServiceWorker(window, import.meta.env.PROD);

const root = document.getElementById("root");

if (root === null) {
  throw new Error("index.html has no #root element to render into");
}

createRoot(root).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
    >
      <RouterProvider router={createBrowserRouter(routes)} />
    </MantineProvider>
  </StrictMode>,
);
