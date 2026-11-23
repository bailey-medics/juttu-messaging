import type { ReactNode } from "react";

import NoAccessLayout from "@/components/layouts/NoAccessLayout";

import { useAuth } from "./AuthContext";

/**
 * Shows its children only to an organisation admin; anybody else signed in
 * sees "No access". Sits inside `RequireAuth`, which has already sent
 * anybody not signed in to sign in. The backend refuses a non-admin too:
 * this only saves them a page that could not load.
 */
export default function RequireAdmin({
  feature,
  children,
}: {
  feature: string;
  children: ReactNode;
}) {
  const { state } = useAuth();

  if (state.status === "authenticated" && state.user.is_admin) {
    return children;
  }

  return <NoAccessLayout feature={feature} />;
}
