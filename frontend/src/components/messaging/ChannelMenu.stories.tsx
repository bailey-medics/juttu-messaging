import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import ChannelMenu from "./ChannelMenu";

const meta: Meta<typeof ChannelMenu> = {
  title: "Messaging/Channel menu",
  component: ChannelMenu,
  parameters: { layout: "centered" },
  args: {
    showsPeople: true,
    hasUploadedIcon: false,
    onToggleShowsPeople: fn(),
    onUploadIcon: fn(),
    onRemoveIcon: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChannelMenu>;

/** A channel that shows its people, with its random icon. */
export const Default: Story = {};

/** A channel with its circles hidden and an uploaded icon, which can be removed. */
export const HiddenWithAnUploadedIcon: Story = {
  args: { showsPeople: false, hasUploadedIcon: true },
};

export const DarkMode: Story = { globals: { colorScheme: "dark" } };
