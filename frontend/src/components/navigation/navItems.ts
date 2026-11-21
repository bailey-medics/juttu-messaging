/**
 * Every entry in Juttu's side navigation, top to bottom. Each new page adds
 * its entry here, with a child link for a page that sits under another, as
 * Quill Medical's navigation does.
 */

import type { NavItem } from "./NestedNavLink";

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/", icon: "home", exact: true },
];

/**
 * The entries only an organisation admin sees, after `NAV_ITEMS`. "Add
 * member" shows beneath "Members" only while that page is open.
 */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Members",
    href: "/members",
    icon: "user",
    children: [{ label: "Add member", href: "/members/new" }],
  },
];
