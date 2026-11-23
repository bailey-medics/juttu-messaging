import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEPLOYS, DEPLOYS_CHANNEL, OLD_BUILDS } from "@/components/senders/fixtures";
import { renderAt, SIGNED_IN, stubFetchRoutes } from "@/test/render";

type Routes = Record<string, { body: unknown; status?: number }>;

function asAdmin(extra: Routes = {}) {
  stubFetchRoutes({
    "/api/auth/me": { body: SIGNED_IN },
    "/api/inlet/senders": { body: { senders: [DEPLOYS, OLD_BUILDS] } },
    "/api/inlet/channels": { body: { channels: [DEPLOYS_CHANNEL] } },
    ...extra,
  });
}

describe("the senders pages", () => {
  it("lists the senders for an admin", async () => {
    asAdmin();

    renderAt("/senders");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Senders" }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText("Old builds"))[0]).toBeInTheDocument();
  });

  it("shows 'No access' to somebody who is not an admin", async () => {
    stubFetchRoutes({
      "/api/auth/me": {
        body: { authenticated: true, user: { ...SIGNED_IN.user, is_admin: false } },
      },
    });

    renderAt("/senders");

    expect(await screen.findByText("No access")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith("/api/inlet/senders", expect.anything());
  });

  it("puts Senders in the side navigation for an admin", async () => {
    asAdmin();
    renderAt("/");

    const nav = within(await screen.findByRole("complementary"));

    expect(await nav.findByRole("link", { name: /Senders/ })).toHaveAttribute(
      "href",
      "/senders",
    );
  });

  it("registers a sender and shows its secret once, then goes back", async () => {
    asAdmin({
      "POST /api/inlet/senders": {
        body: { ...DEPLOYS, secret: "1.made-up-secret" },
        status: 201,
      },
    });
    renderAt("/senders/new");

    await userEvent.type(await screen.findByLabelText(/Name/), "Deploys");
    await userEvent.click(screen.getByRole("combobox", { name: /Channel/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Release / deploys" }));
    await userEvent.click(screen.getByRole("button", { name: "Register sender" }));

    expect(await screen.findByLabelText("Secret")).toHaveValue("1.made-up-secret");
    expect(fetch).toHaveBeenCalledWith(
      "/api/inlet/senders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Deploys", channel: 11 }),
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Senders" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("1.made-up-secret")).toBeNull();
  });

  it("says why a sender was not registered", async () => {
    asAdmin({
      "POST /api/inlet/senders": {
        body: { detail: "A sender's cards must land in a channel." },
        status: 400,
      },
    });
    renderAt("/senders/new");

    await userEvent.type(await screen.findByLabelText(/Name/), "Deploys");
    await userEvent.click(screen.getByRole("combobox", { name: /Channel/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Release / deploys" }));
    await userEvent.click(screen.getByRole("button", { name: "Register sender" }));

    expect(
      await screen.findByText("A sender's cards must land in a channel."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Secret")).toBeNull();
  });

  it("closes a sender once the admin confirms", async () => {
    asAdmin({
      "POST /api/inlet/senders/1/close": {
        body: { ...DEPLOYS, closed_at: "2026-11-21T21:00:00Z" },
      },
    });
    renderAt("/senders");

    await userEvent.click(
      (await screen.findAllByRole("button", { name: "Actions for Deploys" }))[0]!,
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Close" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Close sender" }));
    await userEvent.click(dialog.getByRole("button", { name: "Close sender" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/inlet/senders/1/close",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByText("Deploys closed")).toBeInTheDocument();
  });
});
