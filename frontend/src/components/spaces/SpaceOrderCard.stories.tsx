import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import SpaceOrderCard from "./SpaceOrderCard";

const meta: Meta<typeof SpaceOrderCard> = {
  title: "Spaces/Space order card",
  component: SpaceOrderCard,
  parameters: { layout: "padded" },
  args: {
    spaces: [
      { id: 1, name: "Release", is_clinical: false, kind: "dev" },
      { id: 2, name: "Allotment", is_clinical: false, kind: "personal" },
      { id: 3, name: "Ward", is_clinical: true, kind: "clinical" },
    ],
    onMove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SpaceOrderCard>;

/** A person's spaces, each with its move buttons. */
export const Default: Story = {};

/** A move that did not save, and was put back. */
export const MoveFailed: Story = { args: { failed: true } };

export const Loading: Story = { args: { spaces: null } };

export const DarkMode: Story = { globals: { colorScheme: "dark" } };
