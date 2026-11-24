import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormSubmitResult } from "@/components/form/Form";
import { MAX_USERNAME } from "@/lib/fieldLimits";
import { renderWithRouter } from "@/test/test-utils";

import SignInForm, { type SignInFormData } from "./SignInForm";

function submitWith(result: FormSubmitResult) {
  return vi.fn<(data: SignInFormData) => Promise<FormSubmitResult>>(async () => result);
}

describe("SignInForm", () => {
  it("asks for a username and a password", () => {
    renderWithRouter(
      <SignInForm
        onSubmit={submitWith({ state: "success", message: { title: "Signed in" } })}
      />,
    );

    expect(screen.getByRole("heading", { name: "Sign in to Juttu" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/)).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText(/Password/)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("shows Juttu's icon above the heading, hidden from screen readers", () => {
    const { container } = renderWithRouter(
      <SignInForm
        onSubmit={submitWith({ state: "success", message: { title: "Signed in" } })}
      />,
    );

    const icon = container.querySelector('img[src="/juttu-icon-transparent.svg"]');

    expect(icon).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("limits the username to what the backend takes", () => {
    renderWithRouter(
      <SignInForm
        onSubmit={submitWith({ state: "success", message: { title: "Signed in" } })}
      />,
    );

    expect(screen.getByLabelText(/Username/)).toHaveAttribute(
      "maxlength",
      String(MAX_USERNAME),
    );
  });

  it("sends the username trimmed and the password exactly as typed", async () => {
    const onSubmit = submitWith({ state: "success", message: { title: "Signed in" } });
    renderWithRouter(<SignInForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Username/), "  sam ");
    await userEvent.type(screen.getByLabelText(/Password/), " spaces count ");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ username: "sam", password: " spaces count " }),
    );
  });

  it("shows why signing in failed", async () => {
    const message = "That username and password do not match an account.";
    renderWithRouter(
      <SignInForm onSubmit={submitWith({ state: "error", message: { title: message } })} />,
    );

    await userEvent.type(screen.getByLabelText(/Username/), "sam");
    await userEvent.type(screen.getByLabelText(/Password/), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("sends nothing while a field is empty", async () => {
    const onSubmit = submitWith({ state: "success", message: { title: "Signed in" } });
    renderWithRouter(<SignInForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
