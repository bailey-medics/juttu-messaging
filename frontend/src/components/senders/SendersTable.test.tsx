import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";

import { DEPLOYS, OLD_BUILDS } from "./fixtures";
import SendersTable from "./SendersTable";

describe("SendersTable", () => {
  it("shows each sender's channel and whether it is open", () => {
    renderWithRouter(<SendersTable senders={[DEPLOYS, OLD_BUILDS]} onClose={vi.fn()} />);

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Release / deploys")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Active")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Closed")).toBeInTheDocument();
  });

  it("closes an open sender from its menu", async () => {
    const onClose = vi.fn();
    renderWithRouter(<SendersTable senders={[DEPLOYS]} onClose={onClose} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Actions for Deploys" })[0]!);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Close" }));

    expect(onClose).toHaveBeenCalledWith(DEPLOYS);
  });

  it("offers nothing on a closed sender's row", () => {
    renderWithRouter(<SendersTable senders={[OLD_BUILDS]} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Actions for Old builds" })).toBeNull();
  });

  it("says when there are no senders", () => {
    renderWithRouter(<SendersTable senders={[]} onClose={vi.fn()} />);

    expect(screen.getAllByText("No senders yet.")[0]).toBeInTheDocument();
  });
});
