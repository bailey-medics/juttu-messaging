/**
 * Every entry in Juttu's side navigation, top to bottom. Each new page adds
 * its entry here, with a child link for a page that sits under another, as
 * Quill Medical's navigation does.
 */

import type { NavItem } from "./NestedNavLink";

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/", icon: "home", exact: true },
  // One space's page has no child link: there is one per space, and the
  // page's own title says which space it is.
  {
    label: "Spaces",
    href: "/spaces",
    icon: "message",
    children: [{ label: "New space", href: "/spaces/new" }],
  },
];

/**
 * The entries only an organisation admin sees, after `NAV_ITEMS`. "Add
 * member" shows beneath "Members", and "Register sender" beneath
 * "Senders", only while that page is open.
 */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Members",
    href: "/members",
    icon: "user",
    children: [{ label: "Add member", href: "/members/new" }],
  },
  {
    label: "Senders",
    href: "/senders",
    icon: "settings",
    children: [{ label: "Register sender", href: "/senders/new" }],
  },
];
