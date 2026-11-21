/**
 * The app's entry point: the theme, then the router.
 */

import "@fontsource-variable/atkinson-hyperlegible-next";
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { routes } from "@/routes";
import { theme } from "@/theme";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("index.html has no #root element to render into");
}

createRoot(root).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <RouterProvider router={createBrowserRouter(routes)} />
    </MantineProvider>
  </StrictMode>,
);
