import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { API_UNREACHABLE } from "@/pages/apiFailure";
import HomePage from "@/pages/HomePage";
import { latestStream, stubEventSource } from "@/test/eventSource";
import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";
import { renderWithRouter } from "@/test/test-utils";

describe("HomePage", () => {
  it("is titled Conversations, with nothing above the list", async () => {
    stubFetchRoutes({ "/api/conversations": { body: { conversations: [] } } });

    renderWithRouter(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Conversations" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.queryByText(/A quiet place/)).not.toBeInTheDocument();
    expect(screen.queryByText("Backend up")).not.toBeInTheDocument();
    expect(await screen.findByText(/No conversations yet/)).toBeInTheDocument();
  });

  describe("your conversations", () => {
    const general = {
      id: 11,
      kind: "channel",
      title: "general",
      unread_count: 3,
      icon: "rocket",
      icon_colour: 0,
      shows_people: true,
      space: { id: 7, name: "Release" },
      last_active_at: "2026-11-21T20:30:00Z",
    };
    const withAlex = {
      id: 12,
      kind: "direct",
      title: "Alex Morgan",
      unread_count: 0,
      icon: "rocket",
      icon_colour: 0,
      shows_people: true,
      space: { id: 9, name: "Design" },
      last_active_at: "2026-11-21T18:05:00Z",
    };

    function routes(conversations: unknown[]) {
      return {
        "/api/auth/me": { body: SIGNED_IN },
        "/api/health": { body: { status: "ok" } },
        "/api/conversations": { body: { conversations } },
      };
    }

    it("lists every conversation with its space and unread count, in order", async () => {
      stubFetchRoutes(routes([general, withAlex]));

      renderWithRouter(<HomePage />);
      await screen.findAllByText("Alex Morgan");

      const rows = screen.getAllByRole("row");
      expect(rows.map((row) => row.textContent)).toEqual([
        expect.stringContaining("Name"),
        expect.stringMatching(/general.*Release.*Channel/),
        expect.stringMatching(/Alex Morgan.*Design.*Direct/),
      ]);
      expect(screen.getAllByLabelText("3 unread")[0]).toBeInTheDocument();
    });

    it("says how to get a conversation when there are none", async () => {
      stubFetchRoutes(routes([]));

      renderWithRouter(<HomePage />);

      expect(
        await screen.findByText(
          "No conversations yet. Once an admin adds you to a space, its channels show here.",
        ),
      ).toBeInTheDocument();
    });

    it("says so when the list cannot be loaded", async () => {
      stubFetchRoutes({
        "/api/health": { body: { status: "ok" } },
        "/api/conversations": { body: { detail: "Unavailable." }, status: 503 },
      });

      renderWithRouter(<HomePage />);

      expect((await screen.findAllByText(API_UNREACHABLE))[0]).toBeInTheDocument();
    });

    it("opens a conversation when its row is chosen", async () => {
      stubFetchRoutes({
        ...routes([general]),
        "/api/conversations/11/messages": { body: { messages: [] } },
        "/api/conversations/11/cards": { body: { cards: [] } },
      });

      renderAt("/");
      await userEvent.click(await screen.findByText("general"));

      expect(
        await screen.findByRole("heading", { level: 1, name: "general" }),
      ).toBeInTheDocument();
    });

    it("loads the list again when a new message arrives", async () => {
      stubEventSource();
      stubFetchRoutes(routes([general]));

      renderAt("/");
      await screen.findByText("general");
      const before = vi
        .mocked(fetch)
        .mock.calls.filter(([url]) => url === "/api/conversations");

      latestStream().emit(
        "message",
        {
          conversation: 11,
          space: 7,
          message: {
            id: 40,
            author: { id: 2, name: "Alex Morgan" },
            body: "Deploying now.",
            created_at: "2026-11-21T20:31:00Z",
            amends: null,
            thread: null,
            reply_count: 0,
          },
        },
        "40.0",
      );

      await waitFor(() =>
        expect(
          vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/conversations").length,
        ).toBe(before.length + 1),
      );
    });

    it("shows a new card's unread count without a refresh", async () => {
      stubEventSource();
      stubFetchRoutes(routes([{ ...general, unread_count: 0 }]));
      renderAt("/");
      await screen.findByText("general");

      stubFetchRoutes(routes([{ ...general, unread_count: 1 }]));
      latestStream().emit(
        "card",
        {
          conversation: 11,
          space: 7,
          card: {
            id: 5,
            kind: "outside",
            title: "Run 4512",
            state: { line: "Running" },
            needs_attention: false,
            created_at: "2026-11-21T20:31:00Z",
            updated_at: "2026-11-21T20:31:00Z",
            events: [{ id: 1, summary: "Running", received_at: "2026-11-21T20:31:00Z" }],
          },
        },
        "0.1",
      );

      expect(await screen.findByLabelText("1 unread")).toBeInTheDocument();
    });
  });
});
