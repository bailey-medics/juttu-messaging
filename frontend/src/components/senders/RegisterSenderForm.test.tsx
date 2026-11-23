import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FormSubmitResult } from "@/components/form/Form";
import { renderWithRouter } from "@/test/test-utils";

import { DEPLOYS_CHANNEL, IDEAS_CHANNEL } from "./fixtures";
import RegisterSenderForm from "./RegisterSenderForm";

function submitWith(result: FormSubmitResult) {
  return vi.fn<(name: string, channelId: number) => Promise<FormSubmitResult>>(
    async () => result,
  );
}

const channels = [IDEAS_CHANNEL, DEPLOYS_CHANNEL];

describe("RegisterSenderForm", () => {
  it("sends the name trimmed and the chosen channel's id", async () => {
    const onSubmit = submitWith({ state: "success", message: { title: "Registered" } });
    renderWithRouter(<RegisterSenderForm channels={channels} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Name/), "  Deploys  ");
    await userEvent.click(screen.getByRole("combobox", { name: /Channel/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Release / deploys" }));
    await userEvent.click(screen.getByRole("button", { name: "Register sender" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Deploys", 11));
  });

  it("sends nothing without a channel", async () => {
    const onSubmit = submitWith({ state: "success", message: { title: "Registered" } });
    renderWithRouter(<RegisterSenderForm channels={channels} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Name/), "Deploys");
    await userEvent.click(screen.getByRole("button", { name: "Register sender" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows why the sender was not registered", async () => {
    renderWithRouter(
      <RegisterSenderForm
        channels={channels}
        onSubmit={submitWith({
          state: "error",
          message: { title: "A sender's cards must land in a channel." },
        })}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Name/), "Deploys");
    await userEvent.click(screen.getByRole("combobox", { name: /Channel/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Design / ideas" }));
    await userEvent.click(screen.getByRole("button", { name: "Register sender" }));

    expect(
      await screen.findByText("A sender's cards must land in a channel."),
    ).toBeInTheDocument();
  });

  it("says to open a channel first when there is none", () => {
    renderWithRouter(
      <RegisterSenderForm
        channels={[]}
        onSubmit={submitWith({ state: "success", message: { title: "Registered" } })}
      />,
    );

    expect(screen.getByPlaceholderText("Open a channel in a space first")).toBeDisabled();
  });
});
