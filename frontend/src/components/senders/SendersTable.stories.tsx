/** The organisation's senders. The names are made up. */
import type { Meta, StoryObj } from "@storybook/react-vite";

import { DEPLOYS, OLD_BUILDS } from "./fixtures";
import SendersTable from "./SendersTable";

const meta: Meta<typeof SendersTable> = {
  title: "Senders/Senders table",
  component: SendersTable,
  parameters: { layout: "padded" },
  args: { senders: [DEPLOYS, OLD_BUILDS], onClose: () => {} },
};

export default meta;
type Story = StoryObj<typeof SendersTable>;

export const Default: Story = {};

export const Empty: Story = { args: { senders: [] } };

export const Loading: Story = { args: { senders: [], loading: true } };
