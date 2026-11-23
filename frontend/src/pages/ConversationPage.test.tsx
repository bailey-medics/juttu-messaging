import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { latestStream, stubEventSource } from "@/test/eventSource";
import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";

const hello = {
  id: 21,
  author: { id: 2, name: "Alex Morgan" },
  body: "Release notes are ready.",
  created_at: "2026-11-21T10:00:00Z",
  amends: null,
  thread: null,
  reply_count: 0,
};

const release = { id: 7, name: "Release", is_clinical: false, kind: "dev" };

function spaceRoutes(conversations: unknown[]) {
  return {
    "/api/auth/me": { body: SIGNED_IN },
    "/api/spaces/7": { body: release },
    "/api/spaces/7/conversations": { body: { conversations } },
    "/api/spaces/7/members": {
      body: {
        members: [
          { id: 1, username: "sam", name: "Sam Patel" },
          { id: 2, username: "alex", name: "Alex Morgan" },
        ],
      },
    },
    "/api/members": { body: { members: [] } },
  };
}

describe("the conversation page", () => {
  it("shows the messages and sends a new one", async () => {
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "/api/conversations/11/messages": { body: { messages: [hello] } },
      "POST /api/conversations/11/messages": {
        body: { ...hello, id: 22, author: { id: 1, name: "Sam Patel" }, body: "Thanks!" },
        status: 201,
      },
    });
    renderAt("/conversations/11");

    expect(await screen.findByText("Release notes are ready.")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Write a message"), "Thanks!{Enter}");

    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/conversations/11/messages",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ body: "Thanks!" }) }),
    );
  });

  it("shows 'Page not found' for a conversation the person cannot read", async () => {
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });

    renderAt("/conversations/99");

    expect(
      await screen.findByRole("heading", { name: "404 - Page not found" }),
    ).toBeInTheDocument();
  });

  it("opens a conversation from its space, with its title", async () => {
    stubFetchRoutes({
      ...spaceRoutes([{ id: 11, kind: "channel", title: "general", unread_count: 0 }]),
      "/api/conversations/11/messages": { body: { messages: [hello] } },
    });
    renderAt("/spaces/7");

    await userEvent.click(await screen.findByText("general"));

    expect(
      await screen.findByRole("heading", { level: 1, name: "general" }),
    ).toBeInTheDocument();
  });

  it("starts a direct conversation with somebody in the space", async () => {
    stubFetchRoutes({
      ...spaceRoutes([]),
      "POST /api/spaces/7/conversations": {
        body: { id: 12, kind: "direct", title: "Alex Morgan", unread_count: 0 },
        status: 201,
      },
      "/api/conversations/12/messages": { body: { messages: [] } },
    });
    renderAt("/spaces/7");

    await userEvent.click(
      await screen.findByRole("button", { name: "Actions for Alex Morgan" }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Message Alex Morgan" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Alex Morgan" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/spaces/7/conversations",
        expect.objectContaining({ body: JSON.stringify({ kind: "direct", user_ids: [2] }) }),
      ),
    );
  });

  it("reopens a direct conversation that already exists", async () => {
    stubFetchRoutes({
      ...spaceRoutes([{ id: 12, kind: "direct", title: "Alex Morgan", unread_count: 0 }]),
      "/api/conversations/12/messages": { body: { messages: [] } },
    });
    renderAt("/spaces/7");

    await userEvent.click(
      await screen.findByRole("button", { name: "Actions for Alex Morgan" }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Message Alex Morgan" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Alex Morgan" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/spaces/7/conversations",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("offers no 'Message' to the person themself", async () => {
    stubFetchRoutes(spaceRoutes([]));

    renderAt("/spaces/7");

    expect(
      await screen.findByRole("button", { name: "Actions for Alex Morgan" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for Sam Patel" }),
    ).not.toBeInTheDocument();
  });

  it("opens a message's thread beside it and replies there", async () => {
    const reply = {
      ...hello,
      id: 30,
      author: { id: 1, name: "Sam Patel" },
      body: "On it.",
      thread: 21,
    };
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "/api/conversations/11/messages": { body: { messages: [{ ...hello, reply_count: 1 }] } },
      "/api/messages/21/replies": { body: { replies: [{ ...reply, id: 29, body: "Seen." }] } },
      "POST /api/conversations/11/messages": { body: reply, status: 201 },
    });
    renderAt("/conversations/11");

    await userEvent.click(await screen.findByRole("button", { name: "1 reply" }));

    expect(await screen.findByRole("heading", { name: "Thread" })).toBeInTheDocument();
    expect(await screen.findByText("Seen.")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Reply in the thread"), "On it.{Enter}");

    expect(await screen.findByText("On it.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "2 replies" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/conversations/11/messages",
      expect.objectContaining({ body: JSON.stringify({ body: "On it.", thread: 21 }) }),
    );
  });

  it("offers 'Reply' on a message with no replies yet", async () => {
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "/api/conversations/11/messages": { body: { messages: [hello] } },
    });

    renderAt("/conversations/11");

    expect(await screen.findByRole("button", { name: "Reply" })).toBeInTheDocument();
  });

  it("marks the conversation read up to its newest message on opening", async () => {
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "/api/conversations/11/messages": { body: { messages: [hello, { ...hello, id: 25 }] } },
      "POST /api/conversations/11/read": { body: null, status: 204 },
    });

    renderAt("/conversations/11");

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/conversations/11/read",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ message_id: 25 }) }),
      ),
    );
  });

  it("shows each conversation's unread count in its space", async () => {
    stubFetchRoutes(
      spaceRoutes([{ id: 11, kind: "channel", title: "general", unread_count: 3 }]),
    );

    renderAt("/spaces/7");

    expect(await screen.findByLabelText("3 unread")).toBeInTheDocument();
  });

  describe("live", () => {
    const fromAlex = { ...hello, id: 40, body: "Deploying now." };

    async function openLive(messages: unknown[]) {
      stubEventSource();
      stubFetchRoutes({
        "/api/auth/me": { body: SIGNED_IN },
        "/api/conversations/11/messages": { body: { messages } },
        "/api/messages/21/replies": { body: { replies: [] } },
        "POST /api/conversations/11/read": { body: null, status: 204 },
        "POST /api/conversations/11/messages": {
          body: { ...hello, id: 41, author: { id: 1, name: "Sam Patel" }, body: "Thanks!" },
          status: 201,
        },
      });
      renderAt("/conversations/11");
      await screen.findByText("Release notes are ready.");
    }

    it("shows a new message without a refresh, and marks it read", async () => {
      await openLive([hello]);

      latestStream().emit("message", { conversation: 11, space: 7, message: fromAlex }, "40");

      expect(await screen.findByText("Deploying now.")).toBeInTheDocument();
      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          "/api/conversations/11/read",
          expect.objectContaining({ body: JSON.stringify({ message_id: 40 }) }),
        ),
      );
    });

    it("leaves out a message from another conversation", async () => {
      await openLive([hello]);

      latestStream().emit("message", { conversation: 12, space: 7, message: fromAlex }, "40");

      await waitFor(() => expect(screen.queryByText("Deploying now.")).not.toBeInTheDocument());
    });

    it("shows the person's own message once, though it also arrives live", async () => {
      await openLive([hello]);

      await userEvent.type(screen.getByPlaceholderText("Write a message"), "Thanks!{Enter}");
      await screen.findByText("Thanks!");
      latestStream().emit(
        "message",
        {
          conversation: 11,
          space: 7,
          message: { ...hello, id: 41, author: { id: 1, name: "Sam Patel" }, body: "Thanks!" },
        },
        "41",
      );

      expect(screen.getAllByText("Thanks!")).toHaveLength(1);
    });

    it("adds a reply to its open thread and counts it once", async () => {
      await openLive([hello]);
      await userEvent.click(await screen.findByRole("button", { name: "Reply" }));
      await screen.findByRole("heading", { name: "Thread" });

      const reply = { ...hello, id: 42, body: "Looks good.", thread: 21 };
      latestStream().emit("message", { conversation: 11, space: 7, message: reply }, "42");
      latestStream().emit("message", { conversation: 11, space: 7, message: reply }, "42");

      expect(await screen.findByText("Looks good.")).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: "1 reply" })).toBeInTheDocument();
      expect(screen.getAllByText("Looks good.")).toHaveLength(1);
    });

    it("counts a reply in a thread that is not open", async () => {
      await openLive([hello]);

      latestStream().emit(
        "message",
        {
          conversation: 11,
          space: 7,
          message: { ...hello, id: 43, body: "Hidden", thread: 21 },
        },
        "43",
      );

      expect(await screen.findByRole("button", { name: "1 reply" })).toBeInTheDocument();
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    });

    it("refreshes a space's unread counts when a message arrives in it", async () => {
      stubEventSource();
      stubFetchRoutes(
        spaceRoutes([{ id: 11, kind: "channel", title: "general", unread_count: 0 }]),
      );
      renderAt("/spaces/7");
      await screen.findByText("general");

      stubFetchRoutes(
        spaceRoutes([{ id: 11, kind: "channel", title: "general", unread_count: 1 }]),
      );
      latestStream().emit("message", { conversation: 11, space: 7, message: fromAlex }, "40");

      expect(await screen.findByLabelText("1 unread")).toBeInTheDocument();
    });

    it("refreshes a space's unread counts when a card arrives in it", async () => {
      stubEventSource();
      stubFetchRoutes(
        spaceRoutes([{ id: 11, kind: "channel", title: "general", unread_count: 0 }]),
      );
      renderAt("/spaces/7");
      await screen.findByText("general");

      stubFetchRoutes(
        spaceRoutes([{ id: 11, kind: "channel", title: "general", unread_count: 1 }]),
      );
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
            created_at: "2026-11-21T10:05:00Z",
            updated_at: "2026-11-21T10:05:00Z",
            events: [{ id: 1, summary: "Running", received_at: "2026-11-21T10:05:00Z" }],
          },
        },
        "0.1",
      );

      expect(await screen.findByLabelText("1 unread")).toBeInTheDocument();
    });
  });

  describe("cards", () => {
    const failing = {
      id: 5,
      kind: "ci-run",
      title: "Build 41 on main",
      state: { status: "running" },
      needs_attention: false,
      created_at: "2026-11-21T10:05:00Z",
      updated_at: "2026-11-21T10:05:00Z",
      events: [{ id: 1, summary: "Running", received_at: "2026-11-21T10:05:00Z" }],
    };

    function openWithCards(cards: unknown[]) {
      stubEventSource();
      stubFetchRoutes({
        "/api/auth/me": { body: SIGNED_IN },
        "/api/conversations/11/messages": {
          body: {
            messages: [
              hello,
              { ...hello, id: 22, body: "Later.", created_at: "2026-11-21T10:10:00Z" },
            ],
          },
        },
        "/api/conversations/11/cards": { body: { cards } },
        "POST /api/conversations/11/read": { body: null, status: 204 },
      });
      renderAt("/conversations/11");
    }

    it("shows each card among the messages, by when it was made", async () => {
      openWithCards([failing]);

      const card = await screen.findByText("Build 41 on main");
      const before = screen.getByText("Release notes are ready.");
      const after = screen.getByText("Later.");

      expect(
        before.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        card.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("changes a card in place as it arrives live", async () => {
      openWithCards([failing]);
      await screen.findByText("Running");

      latestStream().emit(
        "card",
        {
          conversation: 11,
          space: 7,
          card: {
            ...failing,
            needs_attention: true,
            events: [
              ...failing.events,
              { id: 2, summary: "Failed on lint", received_at: "2026-11-21T10:09:00Z" },
            ],
          },
        },
        "0.2",
      );

      expect(await screen.findByText("Failed on lint")).toBeInTheDocument();
      expect(screen.getByText("Needs you")).toBeInTheDocument();
      expect(screen.getAllByText("Build 41 on main")).toHaveLength(1);
    });

    it("marks the cards read up to the newest on opening", async () => {
      openWithCards([failing, { ...failing, id: 8, title: "Build 42" }]);

      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          "/api/conversations/11/read",
          expect.objectContaining({ method: "POST", body: JSON.stringify({ card_id: 8 }) }),
        ),
      );
    });

    it("marks a new card read as it arrives live", async () => {
      openWithCards([]);
      await screen.findByText("Later.");

      latestStream().emit(
        "card",
        { conversation: 11, space: 7, card: { ...failing, id: 6, title: "Build 42" } },
        "0.2",
      );

      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          "/api/conversations/11/read",
          expect.objectContaining({ body: JSON.stringify({ card_id: 6 }) }),
        ),
      );
    });

    it("adds a new card that arrives live, but not one from elsewhere", async () => {
      openWithCards([]);
      await screen.findByText("Later.");

      latestStream().emit("card", { conversation: 12, space: 7, card: failing }, "0.1");
      latestStream().emit(
        "card",
        { conversation: 11, space: 7, card: { ...failing, id: 6, title: "Build 42" } },
        "0.2",
      );

      expect(await screen.findByText("Build 42")).toBeInTheDocument();
      expect(screen.queryByText("Build 41 on main")).not.toBeInTheDocument();
    });
  });
});
