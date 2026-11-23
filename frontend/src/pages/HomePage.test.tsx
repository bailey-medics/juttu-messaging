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
      icon_url: null,
      space: { id: 7, name: "Release", kind: "dev" },
      last_active_at: "2026-11-21T20:30:00Z",
      last_item: null,
      people: [],
    };
    const withAlex = {
      id: 12,
      kind: "direct",
      title: "Alex Morgan",
      unread_count: 0,
      icon: "rocket",
      icon_colour: 0,
      shows_people: true,
      icon_url: null,
      space: { id: 9, name: "Design", kind: "dev" },
      last_active_at: "2026-11-21T18:05:00Z",
      last_item: null,
      people: [],
    };

    function routes(conversations: unknown[]) {
      return {
        "/api/auth/me": { body: SIGNED_IN },
        "/api/health": { body: { status: "ok" } },
        "/api/conversations": { body: { conversations } },
      };
    }

    it("lists each space's conversations under its name, Dev spaces first", async () => {
      stubFetchRoutes(
        routes([{ ...withAlex, space: { id: 9, name: "Design", kind: "personal" } }, general]),
      );

      renderWithRouter(<HomePage />);

      const design = await screen.findByRole("heading", { name: "Design" });
      const release = screen.getByRole("heading", { name: "Release" });
      expect(
        release.compareDocumentPosition(design) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByLabelText("3 unread")).toBeInTheDocument();
    });

    it("previews each conversation's newest item", async () => {
      stubFetchRoutes(
        routes([
          { ...general, last_item: { text: "Run 4512: Passed", at: "2026-11-21T20:30:00Z" } },
          withAlex,
        ]),
      );

      renderWithRouter(<HomePage />);

      expect(await screen.findByText("Run 4512: Passed")).toBeInTheDocument();
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });

    it("draws the others' initials, or the conversation's own icon", async () => {
      stubFetchRoutes(
        routes([general, { ...withAlex, people: [{ id: 2, name: "Alex Morgan" }] }]),
      );

      renderWithRouter(<HomePage />);

      expect(await screen.findByText("AM")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "general" })).toBeInTheDocument();
    });

    it("says how to get a conversation when there are none", async () => {
      stubFetchRoutes(routes([]));

      renderWithRouter(<HomePage />);

      expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
      expect(
        screen.getByText("Once an admin adds you to a space, its channels show here."),
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
