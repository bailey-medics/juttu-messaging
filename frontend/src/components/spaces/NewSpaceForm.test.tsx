import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SpaceKind } from "@/api/spaces";
import type { FormSubmitResult } from "@/components/form/Form";
import { renderWithRouter } from "@/test/test-utils";

import NewSpaceForm from "./NewSpaceForm";

function submitter() {
  return vi.fn<(name: string, kind: SpaceKind) => Promise<FormSubmitResult>>(async () => ({
    state: "success",
    message: { title: "Made" },
  }));
}

describe("NewSpaceForm", () => {
  it("makes a Dev space unless another kind is chosen", async () => {
    const onSubmit = submitter();
    renderWithRouter(<NewSpaceForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Space name/), "  Release ");
    await userEvent.click(screen.getByRole("button", { name: "Make space" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Release", "dev"));
  });

  it("offers the three kinds, in Home's order", () => {
    renderWithRouter(<NewSpaceForm onSubmit={submitter()} />);

    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual([
      "dev",
      "personal",
      "clinical",
    ]);
  });

  it("sends the kind chosen, and says what a clinical space is for", async () => {
    const onSubmit = submitter();
    renderWithRouter(<NewSpaceForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Space name/), "Ward");
    await userEvent.click(screen.getByRole("radio", { name: "Clinical" }));

    expect(screen.getByText(/do not type any/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Make space" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Ward", "clinical"));
  });

  it("sends nothing for a name of only spaces", async () => {
    const onSubmit = submitter();
    renderWithRouter(<NewSpaceForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Space name/), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Make space" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
