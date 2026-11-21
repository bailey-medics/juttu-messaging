import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";

const alex = { id: 2, username: "alex", name: "Alex Morgan", is_admin: false };
const sam = { id: 1, username: "sam", name: "Sam Patel", is_admin: true };

function asAdmin(extra: Record<string, { body: unknown; status?: number }> = {}) {
  stubFetchRoutes({
    "/api/auth/me": { body: SIGNED_IN },
    "/api/members": { body: { members: [alex, sam] } },
    ...extra,
  });
}

describe("the members pages", () => {
  it("lists the members for an admin", async () => {
    asAdmin();

    renderAt("/members");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Members" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Alex Morgan")).toBeInTheDocument();
  });

  it("shows 'No access' to somebody who is not an admin", async () => {
    stubFetchRoutes({
      "/api/auth/me": {
        body: { authenticated: true, user: { ...SIGNED_IN.user, is_admin: false } },
      },
    });

    renderAt("/members");

    expect(await screen.findByText("No access")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith("/api/members", expect.anything());
  });

  it("puts Members in the side navigation for an admin only", async () => {
    asAdmin();
    renderAt("/");

    const nav = within(await screen.findByRole("complementary"));

    expect(await nav.findByRole("link", { name: /Members/ })).toHaveAttribute(
      "href",
      "/members",
    );
  });

  it("removes a member once the admin confirms", async () => {
    asAdmin({ "/api/members/2/remove": { body: null, status: 204 } });
    renderAt("/members");

    await userEvent.click(
      await screen.findByRole("button", { name: "Actions for Alex Morgan" }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/members/2/remove",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByText("Alex Morgan removed")).toBeInTheDocument();
  });

  it("adds a person, then says so back on the members page", async () => {
    asAdmin();
    renderAt("/members/new");
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "/api/members": {
        body: { id: 3, username: "priya", name: "Priya Shah", is_admin: false },
        status: 201,
      },
    });

    await userEvent.type(await screen.findByLabelText(/Name/), "Priya Shah");
    await userEvent.type(screen.getByLabelText(/Username/), "priya");
    await userEvent.type(screen.getByLabelText(/Password/), "a long made-up passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(await screen.findByText("Priya Shah added")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Members" })).toBeInTheDocument();
  });

  it("shows the backend's reason when a person cannot be added", async () => {
    asAdmin();
    renderAt("/members/new");
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "/api/members": { body: { detail: "That username is taken." }, status: 400 },
    });

    await userEvent.type(await screen.findByLabelText(/Name/), "Priya Shah");
    await userEvent.type(screen.getByLabelText(/Username/), "alex");
    await userEvent.type(screen.getByLabelText(/Password/), "a long made-up passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(await screen.findByText("That username is taken.")).toBeInTheDocument();
  });
});
