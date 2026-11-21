import { Stack } from "@mantine/core";

import { BodyText, PageHeader, TextLink } from "@/components/typography";

/** Shown for an address that matches no page. */
export default function NotFoundPage() {
  return (
    <Stack gap="md">
      <PageHeader title="Page not found" />
      <BodyText>There is no page at this address.</BodyText>
      <TextLink to="/" standalone>
        Go to the home page
      </TextLink>
    </Stack>
  );
}
