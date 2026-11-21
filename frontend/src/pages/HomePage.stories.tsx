import type { Meta, StoryObj } from "@storybook/react-vite";

import HomePage from "@/pages/HomePage";

/**
 * Storybook has no backend, so each story answers the health check itself,
 * and puts the real `fetch` back afterwards.
 */
function answerHealthCheck(answer: () => Promise<Response>) {
  return () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = answer;

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
  beforeEach: answerHealthCheck(
    async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
  ),
};

export const BackendDown: Story = {
  beforeEach: answerHealthCheck(async () => new Response("", { status: 502 })),
};

export const Checking: Story = {
  beforeEach: answerHealthCheck(() => new Promise<Response>(() => {})),
};
