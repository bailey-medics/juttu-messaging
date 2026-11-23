import { Outlet } from "react-router";

import { useAuth } from "@/auth/AuthContext";
import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import MainLayout from "@/components/layouts/MainLayout";
import { ConnectivityProvider, NavigationBlocker } from "@/connectivity";

/**
 * The frame every page sits in: Quill Medical's `MainLayout`, with Juttu's
 * ribbon, its side navigation and the page, as Quill's root layout uses it.
 * Only for somebody signed in, so the navigation ends with "Sign out".
 * The ribbon has no right section: installing Juttu is offered on the
 * Settings page, and the inbox waits until it has a count to show.
 */
export default function RootLayout() {
  const { state, signOut } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.is_admin;

  return (
    // Whether the backend can be reached, as Quill Medical's root layout
    // has it: offline, a move to another page is held and explained.
    <ConnectivityProvider>
      <NavigationBlocker />
      <MainLayout onSignOut={signOut} showAdmin={isAdmin}>
        {/* A page that throws shows the fallback inside the frame, so the
            ribbon and the navigation stay and somebody can still go home. */}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </MainLayout>
    </ConnectivityProvider>
  );
}
