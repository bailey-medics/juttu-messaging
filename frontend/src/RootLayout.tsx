import { AppShell, Container, Group, Title } from "@mantine/core";
import { Outlet } from "react-router";

/**
 * The frame every page sits in: a header with Juttu's name, and the page
 * beneath it. Ported from Quill Medical's root layout, without its patient
 * context and navigation, which Juttu does not have yet.
 */
export default function RootLayout() {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md">
          <Title order={2} size="lg">
            Juttu
          </Title>
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
