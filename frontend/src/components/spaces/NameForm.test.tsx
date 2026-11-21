import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormSubmitResult } from "@/components/form/Form";
import { renderWithRouter } from "@/test/test-utils";

import NameForm from "./NameForm";

function submitter() {
  return vi.fn<(name: string) => Promise<FormSubmitResult>>(async () => ({
    state: "success",
    message: { title: "Made" },
  }));
}

describe("NameForm", () => {
  it("sends the name trimmed", async () => {
    const onSubmit = submitter();
    renderWithRouter(
      <NameForm
        label="Space name"
        submitLabel="Make space"
        maxLength={100}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Space name/), "  Release ");
    await userEvent.click(screen.getByRole("button", { name: "Make space" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Release"));
  });

  it("sends nothing for a name of only spaces", async () => {
    const onSubmit = submitter();
    renderWithRouter(
      <NameForm
        label="Space name"
        submitLabel="Make space"
        maxLength={100}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Space name/), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Make space" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("limits the name to what the backend takes", () => {
    renderWithRouter(
      <NameForm
        label="Space name"
        submitLabel="Make space"
        maxLength={100}
        onSubmit={submitter()}
      />,
    );

    expect(screen.getByLabelText(/Space name/)).toHaveAttribute("maxlength", "100");
  });
});
