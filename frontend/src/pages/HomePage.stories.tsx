import type { Meta, StoryObj } from "@storybook/react-vite";

import type { HomeConversation } from "@/api/conversations";
import HomePage from "@/pages/HomePage";

const CONVERSATIONS: HomeConversation[] = [
  {
    id: 11,
    kind: "channel",
    title: "general",
    unread_count: 3,
    space: { id: 7, name: "Release" },
    last_active_at: "2026-11-21T20:30:00Z",
  },
  {
    id: 12,
    kind: "direct",
    title: "Alex Morgan",
    unread_count: 0,
    space: { id: 7, name: "Release" },
    last_active_at: "2026-11-21T18:05:00Z",
  },
  {
    id: 14,
    kind: "channel",
    title: "ideas",
    unread_count: 0,
    space: { id: 9, name: "Design" },
    last_active_at: "2026-11-20T09:12:00Z",
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/**
 * Storybook has no backend, so each story answers the page's requests
 * itself: the conversations list and the health check. It puts the real
 * `fetch` back afterwards.
 */
function answer(
  health: () => Promise<Response>,
  conversations: HomeConversation[] = CONVERSATIONS,
) {
  return () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/api/conversations")) {
        return json({ conversations });
      }

      return health();
    };

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

export const BackendUp: Story = {
  beforeEach: answer(async () => json({ status: "ok" })),
};

export const NoConversationsYet: Story = {
  beforeEach: answer(async () => json({ status: "ok" }), []),
};

export const BackendDown: Story = {
  beforeEach: answer(async () => new Response("", { status: 502 })),
};

export const Checking: Story = {
  beforeEach: answer(() => new Promise<Response>(() => {})),
};
