/**
 * The sign-in form, signing in, refusing a wrong password and refusing too
 * many attempts. The usernames and passwords are made up.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import type { FormSubmitResult } from "@/components/form/Form";

import SignInForm from "./SignInForm";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const meta: Meta<typeof SignInForm> = {
  title: "Sign in/Sign in form",
  component: SignInForm,
  parameters: { layout: "padded" },
  args: {
    onSubmit: async (): Promise<FormSubmitResult> => {
      await delay(800);
      return { state: "success", message: { title: "Signed in" } };
    },
  },
};

export default meta;
type Story = StoryObj<typeof SignInForm>;

/** Empty, as it first appears. */
export const Default: Story = {};

/** A username and password that match no account. */
export const WrongPassword: Story = {
  args: {
    onSubmit: async (): Promise<FormSubmitResult> => {
      await delay(300);
      return {
        state: "error",
        message: { title: "That username and password do not match an account." },
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Username/), "sam");
    await userEvent.type(canvas.getByLabelText(/Password/), "not the right one");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
  },
};

/** The sixth attempt in a minute from one address. */
export const TooManyAttempts: Story = {
  args: {
    onSubmit: async (): Promise<FormSubmitResult> => {
      await delay(300);
      return {
        state: "error",
        message: { title: "Too many sign-in attempts. Wait a minute, then try again." },
      };
    },
  },
  play: WrongPassword.play,
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
