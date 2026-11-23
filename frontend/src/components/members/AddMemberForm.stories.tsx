/** The form an admin fills in to add a person. The names are made up. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import type { FormSubmitResult } from "@/components/form/Form";

import AddMemberForm from "./AddMemberForm";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const meta: Meta<typeof AddMemberForm> = {
  title: "Members/Add member form",
  component: AddMemberForm,
  parameters: { layout: "padded" },
  args: {
    onSubmit: async (): Promise<FormSubmitResult> => {
      await delay(600);
      return { state: "success", message: { title: "Priya Shah added" } };
    },
  },
};

export default meta;
type Story = StoryObj<typeof AddMemberForm>;

export const Default: Story = {};

/** The username is taken already. */
export const UsernameTaken: Story = {
  args: {
    onSubmit: async (): Promise<FormSubmitResult> => {
      await delay(300);
      return { state: "error", message: { title: "That username is taken." } };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Name/), "Priya Shah");
    await userEvent.type(canvas.getByLabelText(/Username/), "priya");
    await userEvent.type(canvas.getByLabelText(/Password/), "a long made-up passphrase");
    await userEvent.click(canvas.getByRole("button", { name: "Add member" }));
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
