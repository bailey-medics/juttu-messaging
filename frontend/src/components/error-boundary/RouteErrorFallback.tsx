/**
 * Route error fallback
 *
 * What the router shows when a route fails before it can render, which
 * `ErrorBoundary` cannot catch: the router catches it itself, and with no
 * `errorElement` it shows its own developer screen ("Unexpected Application
 * Error!"), in production too.
 *
 * Ported from Quill Medical's, without its error reporting. Set as the
 * `errorElement` of the root route in `routes.tsx`, so every page inherits
 * it. It shows the same fallback as `ErrorBoundary`.
 */

import { useEffect } from "react";
import { useRouteError } from "react-router";

import { ErrorFallback } from "./ErrorBoundary";

function reloadPage(): void {
  window.location.reload();
}

export default function RouteErrorFallback() {
  const error = useRouteError();

  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return <ErrorFallback onReload={reloadPage} />;
}
