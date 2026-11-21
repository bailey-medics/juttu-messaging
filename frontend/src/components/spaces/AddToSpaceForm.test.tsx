import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormSubmitResult } from "@/components/form/Form";
import { renderWithRouter } from "@/test/test-utils";

import AddToSpaceForm from "./AddToSpaceForm";

const people = [
  { value: "2", label: "Alex Morgan" },
  { value: "3", label: "Priya Shah" },
];

function submitter() {
  return vi.fn<(userId: number) => Promise<FormSubmitResult>>(async () => ({
    state: "success",
    message: { title: "Added" },
  }));
}

describe("AddToSpaceForm", () => {
  it("sends the chosen person's id", async () => {
    const onSubmit = submitter();
    renderWithRouter(<AddToSpaceForm people={people} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("combobox", { name: /Person/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Priya Shah" }));
    await userEvent.click(screen.getByRole("button", { name: "Add to space" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(3));
  });

  it("sends nothing until somebody is chosen", async () => {
    const onSubmit = submitter();
    renderWithRouter(<AddToSpaceForm people={people} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Add to space" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("says when everybody is in the space already", () => {
    renderWithRouter(<AddToSpaceForm people={[]} onSubmit={submitter()} />);

    expect(screen.getByPlaceholderText("Everybody is in this space")).toBeDisabled();
  });
});
