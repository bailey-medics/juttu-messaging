import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { LivingCard } from "@/api/cards";
import { renderWithTheme } from "@/test/render";

import LivingCardView from "./LivingCardView";

const card: LivingCard = {
  id: 1,
  kind: "ci-run",
  title: "Build 41 on main",
  state: { status: "failed" },
  needs_attention: true,
  created_at: "2026-11-21T10:00:00Z",
  updated_at: "2026-11-21T10:04:00Z",
  events: [
    { id: 1, summary: "Running", received_at: "2026-11-21T10:00:00Z" },
    { id: 2, summary: "Failed on lint", received_at: "2026-11-21T10:04:00Z" },
  ],
};

describe("LivingCardView", () => {
  it("shows where the card stands, and that it needs somebody", () => {
    renderWithTheme(<LivingCardView card={card} />);

    expect(screen.getByText("Build 41 on main")).toBeInTheDocument();
    expect(screen.getByText("Failed on lint")).toBeInTheDocument();
    expect(screen.getByText("Needs you")).toBeInTheDocument();
    expect(screen.queryByText("Running")).not.toBeInTheDocument();
  });

  it("shows the thread of what happened when asked", async () => {
    renderWithTheme(<LivingCardView card={card} />);

    await userEvent.click(screen.getByRole("button", { name: "Show what happened (2)" }));

    const thread = screen.getByRole("list", { name: "What happened to Build 41 on main" });
    expect(thread).toHaveTextContent("Running");
    expect(thread).toHaveTextContent("Failed on lint");

    await userEvent.click(screen.getByRole("button", { name: "Hide what happened" }));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("offers no thread for a card with one event, and no badge when all is well", () => {
    renderWithTheme(
      <LivingCardView
        card={{ ...card, needs_attention: false, events: card.events.slice(0, 1) }}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs you")).not.toBeInTheDocument();
  });
});
