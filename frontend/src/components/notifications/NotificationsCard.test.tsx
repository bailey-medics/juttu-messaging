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

describe("NotificationsCard's choice of what notifies", () => {
  it("shows the person's choice, quiet as the default", () => {
    renderWithTheme(<NotificationsCard state="on" level="quiet" onEnable={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Direct messages and mentions/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Every message/ })).not.toBeChecked();
  });

  it("hands on a new choice", async () => {
    const onLevelChange = vi.fn();
    renderWithTheme(
      <NotificationsCard
        state="unsupported"
        level="quiet"
        onEnable={vi.fn()}
        onLevelChange={onLevelChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /Every message/ }));

    expect(onLevelChange).toHaveBeenCalledWith("everything");
  });

  it("offers no choice until it has loaded", () => {
    renderWithTheme(<NotificationsCard state="on" onEnable={vi.fn()} />);

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("says when a choice was not saved", () => {
    renderWithTheme(
      <NotificationsCard state="on" level="quiet" levelFailed onEnable={vi.fn()} />,
    );

    expect(screen.getByText("Your choice was not saved. Try again.")).toBeInTheDocument();
  });
});
