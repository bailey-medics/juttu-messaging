import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import NotificationsCard from "./NotificationsCard";

const meta = {
  title: "Components/NotificationsCard",
  component: NotificationsCard,
  args: { onEnable: fn() },
} satisfies Meta<typeof NotificationsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Available: Story = { args: { state: "available" } };

export const Enabling: Story = { args: { state: "available", busy: true } };

export const Failed: Story = { args: { state: "available", failed: true } };

export const On: Story = { args: { state: "on" } };

export const Denied: Story = { args: { state: "denied" } };

export const Unsupported: Story = { args: { state: "unsupported" } };

export const OffOnTheServer: Story = { args: { state: "off" } };
