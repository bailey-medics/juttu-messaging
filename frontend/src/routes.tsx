import type { RouteObject } from "react-router";

import RouteErrorFallback from "@/components/error-boundary/RouteErrorFallback";
import PageSpinner from "@/components/loading-spinner/PageSpinner";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import RootLayout from "@/RootLayout";

/** Every page Juttu has, inside the root layout. */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    // A route that fails before it renders shows Juttu's fallback page, not
    // the router's own developer screen.
    errorElement: <RouteErrorFallback />,
    // Shown while the router is still loading a page.
    hydrateFallbackElement: <PageSpinner />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
