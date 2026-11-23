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
  // After Spaces, as Quill Medical places it. The page has no child link:
  // it has no pages under it yet.
  { label: "Settings", href: "/settings", icon: "settings" },
];

/**
 * The entries only an organisation admin sees, after `NAV_ITEMS`. "Add
 * member" shows beneath "Members" while that page is open. "Admin" is a
 * heading, as in Quill Medical, with Senders beneath it while any admin
 * page is open, and "Register sender" beneath Senders while that is.
 */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Members",
    href: "/members",
    icon: "user",
    children: [{ label: "Add member", href: "/members/new" }],
  },
  {
    label: "Admin",
    href: "/admin",
    icon: "adjustments",
    // Admin is pressed to reach what is under it, so on a narrow screen
    // the drawer stays open to offer those pages, as Quill sets it.
    keepsDrawerOpen: true,
    children: [
      {
        label: "Senders",
        href: "/senders",
        icon: "webhook",
        children: [{ label: "Register sender", href: "/senders/new" }],
      },
    ],
  },
];
