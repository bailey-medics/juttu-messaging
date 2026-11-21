import type { Meta, StoryObj } from "@storybook/react-vite";

import SignOutNavLink from "./SignOutNavLink";

const meta: Meta<typeof SignOutNavLink> = {
  title: "Navigation/Sign out link",
  component: SignOutNavLink,
  parameters: { layout: "padded" },
  args: { onSignOut: async () => {} },
};

export default meta;
type Story = StoryObj<typeof SignOutNavLink>;

/** As it sits at the foot of the side navigation. */
export const Default: Story = {};

/** Signing out failed: press it to see the message beneath the link. */
export const SignOutFails: Story = {
  args: {
    onSignOut: async () => Promise.reject(new TypeError("no network")),
  },
};

export const WithoutIcon: Story = {
  args: { showIcons: false },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
