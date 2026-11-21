import { AppShell, Container, Group, Title } from "@mantine/core";
import { Outlet } from "react-router";

import InstallButton from "@/components/install-button/InstallButton";

/**
 * The frame every page sits in: a header with Juttu's name and, when the
 * browser offers one, an install button, and the page beneath it. Ported from Quill Medical's root layout, without its patient
 * context and navigation, which Juttu does not have yet.
 */
export default function RootLayout() {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header bg="primary.8" c="white">
        <Group h="100%" px="md" justify="space-between">
          <Title order={2} size="lg">
            Juttu
          </Title>
          <InstallButton />
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
