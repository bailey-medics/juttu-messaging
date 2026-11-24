import { Stack } from "@mantine/core";

import { BodyText, PageHeader } from "@/components/typography";

/**
 * The page the "Admin" heading in the side navigation opens, at `/admin`,
 * for an organisation admin. A placeholder for now: the admin pages are
 * listed beneath "Admin" in the menu.
 */
export default function AdminPage() {
  return (
    <Stack gap="lg">
      <PageHeader title="Admin" />
      <BodyText>Admin tools are listed under Admin in the menu.</BodyText>
    </Stack>
  );
}
