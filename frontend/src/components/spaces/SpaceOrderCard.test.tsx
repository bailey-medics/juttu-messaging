import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Space } from "@/api/spaces";
import { renderWithMantine } from "@/test/test-utils";

import SpaceOrderCard from "./SpaceOrderCard";

const SPACES: Space[] = [
  { id: 1, name: "Release", is_clinical: false, kind: "dev" },
  { id: 2, name: "Allotment", is_clinical: false, kind: "personal" },
  { id: 3, name: "Ward", is_clinical: true, kind: "clinical" },
];

describe("SpaceOrderCard", () => {
  it("lists the spaces in the order given", () => {
    renderWithMantine(<SpaceOrderCard spaces={SPACES} onMove={vi.fn()} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Release",
      "Allotment",
      "Ward",
    ]);
  });

  it("moves a space up or down", async () => {
    const onMove = vi.fn();
    renderWithMantine(<SpaceOrderCard spaces={SPACES} onMove={onMove} />);

    await userEvent.click(screen.getByRole("button", { name: "Move Allotment up" }));
    await userEvent.click(screen.getByRole("button", { name: "Move Allotment down" }));

    expect(onMove.mock.calls).toEqual([
      [1, -1],
      [1, 1],
    ]);
  });

  it("turns off moving the first up and the last down", () => {
    renderWithMantine(<SpaceOrderCard spaces={SPACES} onMove={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Move Release up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Ward down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Release down" })).toBeEnabled();
  });

  it("says when a move did not save", () => {
    renderWithMantine(<SpaceOrderCard spaces={SPACES} onMove={vi.fn()} failed />);

    expect(screen.getByText("That move did not save. Try again.")).toBeInTheDocument();
  });
});
