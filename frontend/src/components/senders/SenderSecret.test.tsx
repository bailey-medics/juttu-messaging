import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";

import SenderSecret from "./SenderSecret";

describe("SenderSecret", () => {
  it("shows the secret once, and where it goes", () => {
    renderWithRouter(
      <SenderSecret name="Deploys" secret="1.made-up-secret" onDone={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: "Deploys is registered" })).toBeInTheDocument();
    expect(screen.getByLabelText("Secret")).toHaveValue("1.made-up-secret");
    expect(screen.getByLabelText("Secret")).toHaveAttribute("readonly");
    expect(screen.getByText(/JUTTU_BOX_INLET_SECRET=<the secret>/)).toBeInTheDocument();
    expect(screen.getByText(/cannot show it again/)).toBeInTheDocument();
  });

  it("says when the admin is done", async () => {
    const onDone = vi.fn();
    renderWithRouter(<SenderSecret name="Deploys" secret="1.made-up-secret" onDone={onDone} />);

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onDone).toHaveBeenCalled();
  });
});
