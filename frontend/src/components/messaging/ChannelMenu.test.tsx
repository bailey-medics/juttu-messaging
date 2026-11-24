import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine } from "@/test/test-utils";

import ChannelMenu, { type ChannelMenuProps } from "./ChannelMenu";

function renderMenu(props: Partial<ChannelMenuProps> = {}) {
  const handlers = {
    onToggleShowsPeople: vi.fn(),
    onUploadIcon: vi.fn(),
    onRemoveIcon: vi.fn(),
  };
  renderWithMantine(
    <ChannelMenu showsPeople hasUploadedIcon={false} {...handlers} {...props} />,
  );

  return handlers;
}

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Channel actions" }));
}

describe("ChannelMenu", () => {
  it("offers to hide the people while they show", async () => {
    const { onToggleShowsPeople } = renderMenu();

    await openMenu();
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Hide people's circles" }),
    );

    expect(onToggleShowsPeople).toHaveBeenCalledOnce();
  });

  it("offers to show the people while they are hidden", async () => {
    renderMenu({ showsPeople: false });

    await openMenu();

    expect(
      await screen.findByRole("menuitem", { name: "Show people's circles" }),
    ).toBeInTheDocument();
  });

  it("hands over the image chosen", async () => {
    const { onUploadIcon } = renderMenu();
    const image = new File(["png"], "icon.png", { type: "image/png" });

    await userEvent.upload(screen.getByLabelText("Channel icon image"), image);

    expect(onUploadIcon).toHaveBeenCalledWith(image);
  });

  it("only lets an image be chosen", () => {
    renderMenu();

    expect(screen.getByLabelText("Channel icon image")).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/webp",
    );
  });

  it("removes an uploaded icon only once confirmed", async () => {
    const { onRemoveIcon } = renderMenu({ hasUploadedIcon: true });

    await openMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Remove icon" }));

    expect(onRemoveIcon).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: "Remove icon" }));

    await waitFor(() => expect(onRemoveIcon).toHaveBeenCalledOnce());
  });

  it("offers no removing with no uploaded icon", async () => {
    renderMenu();

    await openMenu();

    expect(screen.queryByRole("menuitem", { name: "Remove icon" })).not.toBeInTheDocument();
  });
});
