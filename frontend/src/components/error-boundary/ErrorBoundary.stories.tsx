import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ErrorFallback } from "@/components/error-boundary/ErrorBoundary";

const meta = {
  title: "Feedback/Error boundary",
  component: ErrorFallback,
  args: { onReload: fn() },
} satisfies Meta<typeof ErrorFallback>;

export default meta;

type Story = StoryObj<typeof meta>;

/** What a page shows in place of itself when something in it throws. */
export const Fallback: Story = {};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
