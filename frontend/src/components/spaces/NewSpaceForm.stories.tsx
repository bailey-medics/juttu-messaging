import type { Meta, StoryObj } from "@storybook/react-vite";

import NewSpaceForm from "./NewSpaceForm";

const meta: Meta<typeof NewSpaceForm> = {
  title: "Spaces/New space form",
  component: NewSpaceForm,
  parameters: { layout: "padded" },
  args: {
    onSubmit: async () => ({ state: "success", message: { title: "Made" } }),
  },
};

export default meta;
type Story = StoryObj<typeof NewSpaceForm>;

/** Naming a new space and choosing its kind, Dev to start with. */
export const Default: Story = {};

export const DarkMode: Story = { ...Default, globals: { colorScheme: "dark" } };
