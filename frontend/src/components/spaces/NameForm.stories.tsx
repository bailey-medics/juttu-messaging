import type { Meta, StoryObj } from "@storybook/react-vite";

import NameForm from "./NameForm";

const meta: Meta<typeof NameForm> = {
  title: "Spaces/Name form",
  component: NameForm,
  parameters: { layout: "padded" },
  args: {
    label: "Space name",
    submitLabel: "Make space",
    maxLength: 100,
    onSubmit: async () => ({ state: "success", message: { title: "Made" } }),
  },
};

export default meta;
type Story = StoryObj<typeof NameForm>;

/** Naming a new space. */
export const Default: Story = {};

/** Naming a new channel. */
export const Channel: Story = { args: { label: "Channel name", submitLabel: "Open channel" } };

export const DarkMode: Story = { ...Default, globals: { colorScheme: "dark" } };
