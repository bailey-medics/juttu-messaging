import type { Meta, StoryObj } from "@storybook/react-vite";

import type { LivingCard } from "@/api/cards";

import LivingCardView from "./LivingCardView";

const running: LivingCard = {
  id: 1,
  kind: "ci-run",
  title: "Build 41 on main",
  state: { status: "running" },
  needs_attention: false,
  created_at: "2026-11-21T10:00:00Z",
  updated_at: "2026-11-21T10:00:00Z",
  events: [{ id: 1, summary: "Running", received_at: "2026-11-21T10:00:00Z" }],
};

const meta = {
  title: "Components/LivingCardView",
  component: LivingCardView,
} satisfies Meta<typeof LivingCardView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { card: running } };

export const NeedsSomebody: Story = {
  args: {
    card: {
      ...running,
      state: { status: "failed" },
      needs_attention: true,
      events: [
        ...running.events,
        { id: 2, summary: "Failed on lint", received_at: "2026-11-21T10:04:00Z" },
      ],
    },
  },
};

export const Passed: Story = {
  args: {
    card: {
      ...running,
      state: { status: "passed" },
      events: [
        ...running.events,
        { id: 2, summary: "Passed", received_at: "2026-11-21T10:04:00Z" },
      ],
    },
  },
};
