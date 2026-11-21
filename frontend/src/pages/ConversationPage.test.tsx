import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";

const hello = {
  id: 21,
  author: { id: 2, name: "Alex Morgan" },
  body: "Release notes are ready.",
  created_at: "2026-11-21T10:00:00Z",
  amends: null,
};

const release = { id: 7, name: "Release", is_clinical: false };

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
      ...spaceRoutes([{ id: 11, kind: "channel", title: "general" }]),
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
        body: { id: 12, kind: "direct", title: "Alex Morgan" },
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
      ...spaceRoutes([{ id: 12, kind: "direct", title: "Alex Morgan" }]),
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
});
