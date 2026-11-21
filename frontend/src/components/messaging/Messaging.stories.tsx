/**
 * Messaging Component Stories
 *
 * Demonstrates the messaging/chat interface component showing:
 * - Conversation thread with sent/received messages
 * - Message input with send functionality
 * - Loading states
 * - Real-time message updates
 */
import demoMessages from "@/demo-data/messaging/demoMessages";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { LivingCardView } from "@/components/cards";

import Messaging, { type Message } from "./Messaging";

const meta: Meta<typeof Messaging> = {
  title: "Messaging/Messaging",
  component: Messaging,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Messaging>;

/**
 * Wrapper component providing stateful message management.
 * Simulates real message sending by appending to the message list.
 */
function Wrapper() {
  const [messages, setMessages] = useState<Message[]>(demoMessages);

  return (
    <Messaging
      messages={messages}
      currentUserId="me"
      onSend={(text) =>
        setMessages((m) => [
          ...m,
          {
            id: String(m.length + 1),
            senderId: "me",
            text,
            timestamp: new Date().toISOString(),
          },
        ])
      }
    />
  );
}

/**
 * Default messaging view with demo conversation.
 * Shows a thread of messages with send functionality.
 * Type a message and click send to add it to the conversation.
 */
export const Default: Story = {
  render: () => <Wrapper />,
};

/**
 * Loading state while fetching messages.
 * Shows skeleton loaders where messages would appear.
 */
export const Loading: Story = {
  render: () => <Messaging messages={[]} currentUserId="me" isLoading={true} />,
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

/**
 * A living card among the messages, drawn across the conversation in a
 * message's place.
 */
export const WithACard: Story = {
  render: () => (
    <Messaging
      currentUserId="me"
      messages={[
        { id: "1", senderId: "alex", senderName: "Alex Morgan", text: "Kicking off a build." },
        {
          id: "card-1",
          senderId: "",
          text: "",
          card: (
            <LivingCardView
              card={{
                id: 1,
                kind: "ci-run",
                title: "Build 41 on main",
                state: { status: "failed" },
                needs_attention: true,
                created_at: "2026-11-21T10:00:00Z",
                updated_at: "2026-11-21T10:04:00Z",
                events: [
                  { id: 1, summary: "Failed on lint", received_at: "2026-11-21T10:04:00Z" },
                ],
              }}
            />
          ),
        },
      ]}
    />
  ),
};
