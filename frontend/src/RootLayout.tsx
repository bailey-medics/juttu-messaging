import { AppShell, Container } from "@mantine/core";
import { Outlet } from "react-router";

import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import InstallButton from "@/components/install-button/InstallButton";
import TopRibbon from "@/components/ribbon";
import { HEADER_HEIGHT } from "@/layout";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";

/**
 * The frame every page sits in: Quill Medical's top ribbon, with Juttu's
 * name and, when the browser offers one, an install button, and the page
 * beneath it. Ported from Quill Medical's root layout, without its patient
 * context and navigation, which Juttu does not have yet.
 */
export default function RootLayout() {
  // Only when the browser offers an install: on a phone the ribbon gives a
  // right section the room the name would take, so an empty one would hide
  // the name for nothing.
  const { canInstall } = useInstallPrompt();

  return (
    <AppShell header={{ height: HEADER_HEIGHT }} padding="md">
      <AppShell.Header withBorder={false}>
        <TopRibbon rightSection={canInstall ? <InstallButton /> : undefined} />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md">
          {/* A page that throws shows the fallback inside the frame, so the
              ribbon stays and somebody can still go home. */}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
