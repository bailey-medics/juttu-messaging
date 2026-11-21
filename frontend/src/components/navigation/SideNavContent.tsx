/**
 * Side navigation content: Juttu's own entries.
 *
 * Quill Medical's version lists its clinical, teaching, admin and passport
 * pages, each behind the competency or feature that grants it. Juttu's
 * starts with the one page it has; each later page adds its entry here,
 * with a child link for a page that sits under another, as Quill's do.
 */

import { Stack } from "@mantine/core";

import NestedNavLink from "./NestedNavLink";
import { NAV_ITEMS } from "./navItems";
import SignOutNavLink from "./SignOutNavLink";

type Props = {
  /** Called after an entry is chosen, to close the mobile drawer. */
  onNavigate?: () => void;
  /** Whether to show icons beside the labels. */
  showIcons?: boolean;
  /** Ends the session. Without it there is no "Sign out" entry. */
  onSignOut?: () => Promise<void>;
};

export default function SideNavContent({ onNavigate, showIcons, onSignOut }: Props) {
  return (
    <Stack gap={2}>
      {NAV_ITEMS.map((item) => (
        <NestedNavLink
          key={item.label}
          item={item}
          onNavigate={onNavigate}
          showIcons={showIcons}
        />
      ))}
      {onSignOut !== undefined && (
        <SignOutNavLink onSignOut={onSignOut} onNavigate={onNavigate} showIcons={showIcons} />
      )}
    </Stack>
  );
}
