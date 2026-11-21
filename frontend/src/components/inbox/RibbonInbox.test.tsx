import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RibbonInbox, { INBOX_PATH } from "@/components/inbox/RibbonInbox";
import { renderWithRouter } from "@/test/test-utils";

describe("RibbonInbox", () => {
  it("draws nothing when nobody is signed in", () => {
    renderWithRouter(<RibbonInbox />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the idle envelope while nothing is waiting", () => {
    renderWithRouter(<RibbonInbox count={0} />);

    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-count")).not.toBeInTheDocument();
  });

  it("says how many things are waiting", () => {
    renderWithRouter(<RibbonInbox count={3} />);

    expect(screen.getByRole("button", { name: "Inbox (3 waiting)" })).toBeInTheDocument();
    expect(screen.getByTestId("inbox-count")).toHaveTextContent("3");
  });

  it("goes to the inbox when pressed", async () => {
    const { router } = renderWithRouter(<RibbonInbox count={2} />);

    await userEvent.click(screen.getByRole("button", { name: /inbox/i }));

    expect(router.state.location.pathname).toBe(INBOX_PATH);
  });
});
