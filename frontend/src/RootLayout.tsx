import { Outlet } from "react-router";

import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import InstallButton from "@/components/install-button/InstallButton";
import MainLayout from "@/components/layouts/MainLayout";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";

/**
 * The frame every page sits in: Quill Medical's `MainLayout`, with Juttu's
 * ribbon, its side navigation and the page, as Quill's root layout uses it.
 */
export default function RootLayout() {
  // Only when the browser offers an install: on a phone the ribbon gives a
  // right section the room the name would take, so an empty one would hide
  // the name for nothing.
  const { canInstall } = useInstallPrompt();

  return (
    <MainLayout rightSection={canInstall ? <InstallButton /> : undefined}>
      {/* A page that throws shows the fallback inside the frame, so the
          ribbon and the navigation stay and somebody can still go home. */}
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </MainLayout>
  );
}
