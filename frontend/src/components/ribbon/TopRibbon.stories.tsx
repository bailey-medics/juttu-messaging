import { Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import TopRibbon from "@/components/ribbon/TopRibbon";

const meta = {
  title: "Components/TopRibbon",
  component: TopRibbon,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TopRibbon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ribbon as every page shows it today: the name, and nothing else. */
export const NameOnly: Story = {};

/** With the install button pinned to the right-hand end. */
export const WithRightSection: Story = {
  args: {
    rightSection: <Button variant="white">Install Juttu</Button>,
  },
};

/**
 * On a phone, the name gives way to the right section, which is the one
 * somebody needs.
 */
export const NarrowWithRightSection: Story = {
  args: {
    rightSection: <Button variant="white">Install Juttu</Button>,
  },
  decorators: [(Story) => <div style={{ width: 360 }}>{Story()}</div>],
};
