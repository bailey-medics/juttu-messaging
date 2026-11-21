import { Group } from "@mantine/core";
import { Outlet } from "react-router";

import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import RibbonInbox from "@/components/inbox/RibbonInbox";
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

  // The inbox draws nothing until it is given a count, which it gets once
  // the vision plan adds accounts; nobody is signed in to have one yet.
  const rightSection = canInstall ? (
    <Group gap="xs" wrap="nowrap">
      <RibbonInbox />
      <InstallButton />
    </Group>
  ) : undefined;

  return (
    <MainLayout rightSection={rightSection}>
      {/* A page that throws shows the fallback inside the frame, so the
          ribbon and the navigation stay and somebody can still go home. */}
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </MainLayout>
  );
}
