/**
 * Side Navigation Component
 *
 * The primary navigation: Juttu's entries, in the side rail on a wide
 * screen and in the drawer behind the burger on a narrow one. Ported from
 * Quill Medical's, without its search field, which Juttu does not have.
 */

import { Stack } from "@mantine/core";

import SideNavContent from "./SideNavContent";

type Props = {
  /** Called after an entry is chosen, to close the mobile drawer. */
  onNavigate?: () => void;
  /** Whether to show icons beside the labels. */
  showIcons?: boolean;
};

export default function SideNav({ onNavigate, showIcons }: Props) {
  return (
    <nav aria-label="Primary" style={{ minWidth: "6.25rem", height: "100%" }}>
      <Stack p="sm" gap="xs">
        <SideNavContent onNavigate={onNavigate} showIcons={showIcons} />
      </Stack>
    </nav>
  );
}
