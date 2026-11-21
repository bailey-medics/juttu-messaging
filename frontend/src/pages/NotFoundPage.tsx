import { Anchor, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

/** Shown for an address that matches no page. */
export default function NotFoundPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Page not found</Title>
      <Text>There is no page at this address.</Text>
      <Anchor component={Link} to="/">
        Go to the home page
      </Anchor>
    </Stack>
  );
}
