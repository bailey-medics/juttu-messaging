/** A thread beside its conversation. The people and messages are made up. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import ThreadPanel from "./ThreadPanel";

const meta: Meta<typeof ThreadPanel> = {
  title: "Messaging/Thread panel",
  component: ThreadPanel,
  parameters: { layout: "padded" },
  args: {
    currentUserId: "1",
    onReply: fn(),
    onClose: fn(),
    messages: [
      {
        id: "1",
        senderId: "2",
        senderName: "Alex Morgan",
        text: "Who is on call tonight?",
        timestamp: "2026-11-21T10:00:00Z",
      },
      {
        id: "2",
        senderId: "1",
        senderName: "Sam Patel",
        text: "I am.",
        timestamp: "2026-11-21T10:02:00Z",
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof ThreadPanel>;

export const Default: Story = {};

export const Loading: Story = { args: { messages: [], isLoading: true } };

export const DarkMode: Story = { ...Default, globals: { colorScheme: "dark" } };
