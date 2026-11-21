import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";

const release = { id: 7, name: "Release", is_clinical: false };
const member = { ...SIGNED_IN, user: { ...SIGNED_IN.user, is_admin: false } };

function space(extra: Record<string, { body: unknown; status?: number }> = {}) {
  return {
    "/api/auth/me": { body: SIGNED_IN },
    "/api/spaces/7": { body: release },
    "/api/spaces/7/conversations": {
      body: { conversations: [{ id: 11, kind: "channel", title: "general", unread_count: 0 }] },
    },
    "/api/spaces/7/members": {
      body: { members: [{ id: 1, username: "sam", name: "Sam Patel" }] },
    },
    "/api/members": {
      body: {
        members: [
          { id: 1, username: "sam", name: "Sam Patel", is_admin: true },
          { id: 2, username: "alex", name: "Alex Morgan", is_admin: false },
        ],
      },
    },
    ...extra,
  };
}

describe("the spaces pages", () => {
  it("lists the person's spaces and opens one", async () => {
    stubFetchRoutes({ ...space(), "/api/spaces": { body: { spaces: [release] } } });
    renderAt("/spaces");

    await userEvent.click(await screen.findByText("Release"));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Release" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("general")).toBeInTheDocument();
  });

  it("offers 'New space' to an admin only", async () => {
    stubFetchRoutes({
      "/api/auth/me": { body: member },
      "/api/spaces": { body: { spaces: [] } },
    });
    renderAt("/spaces");

    expect(await screen.findByText("You are not in any spaces yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New space" })).not.toBeInTheDocument();
  });

  it("makes a space and goes to it", async () => {
    stubFetchRoutes({ ...space(), "/api/spaces": { body: release, status: 201 } });
    renderAt("/spaces/new");

    await userEvent.type(await screen.findByLabelText(/Space name/), "Release");
    await userEvent.click(screen.getByRole("button", { name: "Make space" }));

    // The message moves into the space's page header once it has loaded.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Release" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Release made")).toBeInTheDocument();
  });

  it("shows 'Page not found' for a space the person is not in", async () => {
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });

    renderAt("/spaces/99");

    expect(
      await screen.findByRole("heading", { name: "404 - Page not found" }),
    ).toBeInTheDocument();
  });

  it("lets an admin put somebody from the organisation in the space", async () => {
    stubFetchRoutes(space());
    renderAt("/spaces/7");
    await screen.findByRole("heading", { level: 1, name: "Release" });
    stubFetchRoutes(space({ "/api/spaces/7/members": { body: null, status: 204 } }));

    await userEvent.click(screen.getByRole("combobox", { name: /Person/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Alex Morgan" }));
    await userEvent.click(screen.getByRole("button", { name: "Add to space" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/spaces/7/members",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ user_id: 2 }) }),
      ),
    );
  });

  it("does not offer an admin somebody already in the space", async () => {
    stubFetchRoutes(space());
    renderAt("/spaces/7");
    await screen.findByRole("heading", { level: 1, name: "Release" });

    await userEvent.click(screen.getByRole("combobox", { name: /Person/ }));

    expect(await screen.findByRole("option", { name: "Alex Morgan" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sam Patel" })).not.toBeInTheDocument();
  });
});
