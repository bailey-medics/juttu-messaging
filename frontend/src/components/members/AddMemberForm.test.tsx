import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormSubmitResult } from "@/components/form/Form";
import { MAX_NAME } from "@/lib/fieldLimits";
import { renderWithRouter } from "@/test/test-utils";

import AddMemberForm, { type AddMemberFormData } from "./AddMemberForm";

function submitWith(result: FormSubmitResult) {
  return vi.fn<(data: AddMemberFormData) => Promise<FormSubmitResult>>(async () => result);
}

async function fillIn() {
  await userEvent.type(screen.getByLabelText(/Name/), " Priya Shah ");
  await userEvent.type(screen.getByLabelText(/Username/), " priya ");
  await userEvent.type(screen.getByLabelText(/Password/), " a long passphrase ");
  await userEvent.click(screen.getByRole("button", { name: "Add member" }));
}

describe("AddMemberForm", () => {
  it("sends the name and username trimmed, and the password as typed", async () => {
    const onSubmit = submitWith({ state: "success", message: { title: "Added" } });
    renderWithRouter(<AddMemberForm onSubmit={onSubmit} />);

    await fillIn();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Priya Shah",
        username: "priya",
        password: " a long passphrase ",
      }),
    );
  });

  it("shows why the person was not added", async () => {
    renderWithRouter(
      <AddMemberForm
        onSubmit={submitWith({ state: "error", message: { title: "That username is taken." } })}
      />,
    );

    await fillIn();

    expect(await screen.findByText("That username is taken.")).toBeInTheDocument();
  });

  it("limits the name to what the backend takes, and asks for a new password", () => {
    renderWithRouter(
      <AddMemberForm
        onSubmit={submitWith({ state: "success", message: { title: "Added" } })}
      />,
    );

    expect(screen.getByLabelText(/Name/)).toHaveAttribute("maxlength", String(MAX_NAME));
    expect(screen.getByLabelText(/Password/)).toHaveAttribute("autocomplete", "new-password");
  });

  it("sends nothing while a field is empty", async () => {
    const onSubmit = submitWith({ state: "success", message: { title: "Added" } });
    renderWithRouter(<AddMemberForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
