import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithTheme } from "@/test/render";

import NotificationsCard from "./NotificationsCard";

describe("NotificationsCard", () => {
  it("offers to turn notifications on", async () => {
    const onEnable = vi.fn();
    renderWithTheme(<NotificationsCard state="available" onEnable={onEnable} />);

    await userEvent.click(screen.getByRole("button", { name: "Enable notifications" }));

    expect(onEnable).toHaveBeenCalledOnce();
  });

  it.each([
    ["on", "This device gets a notification when a message arrives."],
    ["denied", "Notifications are blocked for Juttu."],
    ["unsupported", "This browser cannot show notifications."],
    ["off", "Notifications are not set up on this server yet."],
    ["checking", "Checking whether this device can show notifications."],
  ] as const)("says where things stand when %s, with no button", (state, words) => {
    renderWithTheme(<NotificationsCard state={state} onEnable={vi.fn()} />);

    expect(screen.getByText(words, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says when turning them on failed", () => {
    renderWithTheme(<NotificationsCard state="available" failed onEnable={vi.fn()} />);

    expect(
      screen.getByText("Notifications could not be turned on. Try again."),
    ).toBeInTheDocument();
  });
});
