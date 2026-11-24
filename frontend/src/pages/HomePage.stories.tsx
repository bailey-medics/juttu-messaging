import type { Meta, StoryObj } from "@storybook/react-vite";

import type { HomeConversation } from "@/api/conversations";
import HomePage from "@/pages/HomePage";

const CONVERSATIONS: HomeConversation[] = [
  {
    id: 11,
    kind: "channel",
    title: "dev-CI",
    unread_count: 3,
    icon: "rocket",
    icon_colour: 4,
    shows_people: false,
    icon_url: null,
    space: { id: 7, name: "Release", kind: "dev" },
    last_active_at: "2026-11-21T20:30:00Z",
    last_item: { text: "Run 4512: Passed", at: "2026-11-21T20:30:00Z" },
    people: [],
  },
  {
    id: 12,
    kind: "direct",
    title: "Alex Morgan",
    unread_count: 0,
    icon: "leaf",
    icon_colour: 9,
    shows_people: true,
    icon_url: null,
    space: { id: 7, name: "Release", kind: "dev" },
    last_active_at: "2026-11-21T18:05:00Z",
    last_item: { text: "Release notes are ready.", at: "2026-11-21T18:05:00Z" },
    people: [{ id: 2, name: "Alex Morgan" }],
  },
  {
    id: 13,
    kind: "channel",
    title: "general",
    unread_count: 1,
    icon: "coffee",
    icon_colour: 14,
    shows_people: true,
    icon_url: null,
    space: { id: 7, name: "Release", kind: "dev" },
    last_active_at: "2026-11-21T17:40:00Z",
    last_item: { text: "Who is on call tonight?", at: "2026-11-21T17:40:00Z" },
    people: [
      { id: 2, name: "Alex Morgan" },
      { id: 3, name: "Priya Shah" },
      { id: 4, name: "Sam Patel" },
    ],
  },
  {
    id: 14,
    kind: "channel",
    title: "allotment",
    unread_count: 0,
    icon: "sun",
    icon_colour: 21,
    shows_people: true,
    icon_url: null,
    space: { id: 9, name: "Home life", kind: "personal" },
    last_active_at: "2026-11-20T09:12:00Z",
    last_item: null,
    people: [],
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
