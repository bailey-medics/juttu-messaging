import type { Meta, StoryObj } from "@storybook/react-vite";

import type { HomeConversation } from "@/api/conversations";
import HomePage from "@/pages/HomePage";

const CONVERSATIONS: HomeConversation[] = [
  {
    id: 11,
    kind: "channel",
    title: "general",
    unread_count: 3,
    icon: "rocket",
    icon_colour: 0,
    shows_people: true,
    icon_url: null,
    space: { id: 7, name: "Release" },
    last_active_at: "2026-11-21T20:30:00Z",
  },
  {
    id: 12,
    kind: "direct",
    title: "Alex Morgan",
    unread_count: 0,
    icon: "rocket",
    icon_colour: 0,
    shows_people: true,
    icon_url: null,
    space: { id: 7, name: "Release" },
    last_active_at: "2026-11-21T18:05:00Z",
  },
  {
    id: 14,
    kind: "channel",
    title: "ideas",
    unread_count: 0,
    icon: "rocket",
    icon_colour: 0,
    shows_people: true,
    icon_url: null,
    space: { id: 9, name: "Design" },
    last_active_at: "2026-11-20T09:12:00Z",
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/**
 * Storybook has no backend, so each story answers the page's request for
 * the conversations itself, or never answers it. It puts the real `fetch`
 * back afterwards.
 */
function answer(conversations: () => Promise<Response>) {
  return () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => conversations();

    return () => {
      globalThis.fetch = realFetch;
    };
  };
}

const meta = {
  title: "Pages/HomePage",
  component: HomePage,
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every conversation the person may read, most recently active first. */
export const Conversations: Story = {
  beforeEach: answer(async () => json({ conversations: CONVERSATIONS })),
};

export const NoConversationsYet: Story = {
  beforeEach: answer(async () => json({ conversations: [] })),
};

/** The list could not be loaded. */
export const CouldNotLoad: Story = {
  beforeEach: answer(async () => new Response("", { status: 502 })),
};

export const Loading: Story = {
  beforeEach: answer(() => new Promise<Response>(() => {})),
};
