/** A new sender's secret, shown once. The secret is made up. */
import type { Meta, StoryObj } from "@storybook/react-vite";

import SenderSecret from "./SenderSecret";

const meta: Meta<typeof SenderSecret> = {
  title: "Senders/Sender secret",
  component: SenderSecret,
  parameters: { layout: "padded" },
  args: {
    name: "Deploys",
    secret: "1.made-up-secret-for-the-story-only-not-real",
    onDone: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SenderSecret>;

export const Default: Story = {};
