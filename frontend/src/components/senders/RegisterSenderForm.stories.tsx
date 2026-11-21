/** The form an admin fills in to register a sender. The names are made up. */
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { FormSubmitResult } from "@/components/form/Form";

import { DEPLOYS_CHANNEL, IDEAS_CHANNEL } from "./fixtures";
import RegisterSenderForm from "./RegisterSenderForm";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const meta: Meta<typeof RegisterSenderForm> = {
  title: "Senders/Register sender form",
  component: RegisterSenderForm,
  parameters: { layout: "padded" },
  args: {
    channels: [IDEAS_CHANNEL, DEPLOYS_CHANNEL],
    onSubmit: async (): Promise<FormSubmitResult> => {
      await delay(600);
      return { state: "success", message: { title: "Registered" } };
    },
  },
};

export default meta;
type Story = StoryObj<typeof RegisterSenderForm>;

export const Default: Story = {};

export const NoChannels: Story = { args: { channels: [] } };
