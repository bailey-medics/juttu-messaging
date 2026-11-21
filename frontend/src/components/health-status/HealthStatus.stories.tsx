import type { Meta, StoryObj } from "@storybook/react-vite";

import HealthStatus from "@/components/health-status/HealthStatus";

const meta = {
  title: "Components/HealthStatus",
  component: HealthStatus,
} satisfies Meta<typeof HealthStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checking: Story = { args: { state: "checking" } };

export const Up: Story = { args: { state: "up" } };

export const Down: Story = { args: { state: "down" } };
