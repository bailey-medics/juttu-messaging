import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine } from "@/test/test-utils";

import ThreadPanel from "./ThreadPanel";

const messages = [
  { id: "1", senderId: "2", senderName: "Alex Morgan", text: "Who is on call tonight?" },
  { id: "2", senderId: "1", senderName: "Sam Patel", text: "I am." },
];

describe("ThreadPanel", () => {
  it("shows the message and its replies", () => {
    renderWithMantine(
      <ThreadPanel messages={messages} currentUserId="1" onReply={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: "Thread" })).toBeInTheDocument();
    expect(screen.getByText("Who is on call tonight?")).toBeInTheDocument();
    expect(screen.getByText("I am.")).toBeInTheDocument();
  });

  it("sends a reply", async () => {
    const onReply = vi.fn();
    renderWithMantine(
      <ThreadPanel messages={messages} currentUserId="1" onReply={onReply} onClose={vi.fn()} />,
    );

    await userEvent.type(screen.getByPlaceholderText("Reply in the thread"), "Thanks{Enter}");

    expect(onReply).toHaveBeenCalledWith("Thanks");
  });

  it("closes", async () => {
    const onClose = vi.fn();
    renderWithMantine(
      <ThreadPanel messages={messages} currentUserId="1" onReply={vi.fn()} onClose={onClose} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Close the thread" }));

    expect(onClose).toHaveBeenCalled();
  });
});
