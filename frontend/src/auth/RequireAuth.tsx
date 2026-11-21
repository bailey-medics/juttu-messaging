import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import PageSpinner from "@/components/loading-spinner/PageSpinner";

import { useAuth } from "./AuthContext";
import CannotReach from "./CannotReach";

/** Where somebody not signed in is sent. */
export const SIGN_IN_PATH = "/sign-in";

/**
 * Shows its children only to somebody signed in, and sends anybody else to
 * the sign-in page. Ported from Quill Medical's `RequireAuth`.
 *
 * The page they wanted goes with them, so signing in brings them back to
 * it. Not after signing out on purpose, though: the next person to sign in
 * on this device would otherwise land on the last person's page.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <PageSpinner />;
  }

  if (state.status === "unreachable") {
    return <CannotReach />;
  }

  if (state.status === "unauthenticated") {
    const from = state.signedOut ? undefined : { from: location.pathname + location.search };

    return <Navigate to={SIGN_IN_PATH} replace state={from} />;
  }

  return children;
}
