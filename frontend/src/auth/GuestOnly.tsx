import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import PageSpinner from "@/components/loading-spinner/PageSpinner";

import { useAuth } from "./AuthContext";
import { returnPath } from "./returnPath";

/**
 * Shows its children only to somebody not signed in, such as the sign-in
 * page. Somebody signed in goes on to the page they first asked for, or
 * home. Ported from Quill Medical's `GuestOnly`, with the router's own
 * navigation in place of a full page load.
 */
export default function GuestOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <PageSpinner />;
  }

  if (state.status === "authenticated") {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  return children;
}
