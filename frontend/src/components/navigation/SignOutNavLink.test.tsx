import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine } from "@/test/test-utils";

import SignOutNavLink, { SIGN_OUT_FAILED } from "./SignOutNavLink";

describe("SignOutNavLink", () => {
  it("signs out, then closes the drawer", async () => {
    const onSignOut = vi.fn(async () => {});
    const onNavigate = vi.fn();
    renderWithMantine(<SignOutNavLink onSignOut={onSignOut} onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
  });

  it("says so and keeps the drawer open when signing out fails", async () => {
    const onNavigate = vi.fn();
    renderWithMantine(
      <SignOutNavLink
        onSignOut={async () => Promise.reject(new TypeError("no network"))}
        onNavigate={onNavigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));

    expect((await screen.findAllByText(SIGN_OUT_FAILED)).length).toBeGreaterThan(0);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("signs out once, however often it is pressed", async () => {
    let finish: () => void = () => {};
    const onSignOut = vi.fn(
      async () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderWithMantine(<SignOutNavLink onSignOut={onSignOut} />);
    const link = screen.getByRole("button", { name: "Sign out" });

    await userEvent.click(link);
    await userEvent.click(link);
    finish();

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
