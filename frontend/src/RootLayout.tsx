import { Group } from "@mantine/core";
import { Outlet } from "react-router";

import { useAuth } from "@/auth/AuthContext";
import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import RibbonInbox from "@/components/inbox/RibbonInbox";
import InstallButton from "@/components/install-button/InstallButton";
import MainLayout from "@/components/layouts/MainLayout";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";

/**
 * The frame every page sits in: Quill Medical's `MainLayout`, with Juttu's
 * ribbon, its side navigation and the page, as Quill's root layout uses it.
 * Only for somebody signed in, so the navigation ends with "Sign out".
 */
export default function RootLayout() {
  const { state, signOut } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.is_admin;

  // Only when the browser offers an install: on a phone the ribbon gives a
  // right section the room the name would take, so an empty one would hide
  // the name for nothing.
  const { canInstall } = useInstallPrompt();

  // The inbox draws nothing until it is given a count, which it gets once
  // the vision plan adds accounts; nobody is signed in to have one yet.
  const rightSection = canInstall ? (
    <Group gap="xs" wrap="nowrap">
      <RibbonInbox />
      <InstallButton />
    </Group>
  ) : undefined;

  return (
    <MainLayout rightSection={rightSection} onSignOut={signOut} showAdmin={isAdmin}>
      {/* A page that throws shows the fallback inside the frame, so the
          ribbon and the navigation stay and somebody can still go home. */}
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </MainLayout>
  );
}
