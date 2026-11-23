import { screen, within } from "@testing-library/react";

import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";

describe("AdminPage", () => {
  it("opens from the Admin heading, with Senders beneath it", async () => {
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });

    renderAt("/admin");

    expect(await screen.findByRole("heading", { level: 1, name: "Admin" })).toBeInTheDocument();
    const nav = within(screen.getByRole("complementary"));
    expect(nav.getByRole("link", { name: /Senders/ })).toHaveAttribute("href", "/senders");
    expect(nav.queryByRole("link", { name: /Register sender/ })).not.toBeInTheDocument();
  });

  it("keeps Members at the top level of the menu", async () => {
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });

    renderAt("/admin");

    const nav = within(await screen.findByRole("complementary"));
    expect(nav.getByRole("link", { name: /Members/ })).toHaveAttribute("href", "/members");
  });

  it("shows 'No access' to somebody who is not an admin, and no Admin heading", async () => {
    stubFetchRoutes({
      "/api/auth/me": {
        body: { authenticated: true, user: { ...SIGNED_IN.user, is_admin: false } },
      },
    });

    renderAt("/admin");

    expect(await screen.findByText("No access")).toBeInTheDocument();
    const nav = within(screen.getByRole("complementary"));
    expect(nav.queryByRole("link", { name: /Admin/ })).not.toBeInTheDocument();
  });
});
