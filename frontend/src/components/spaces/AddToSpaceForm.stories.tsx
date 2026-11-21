import type { Meta, StoryObj } from "@storybook/react-vite";

import AddToSpaceForm from "./AddToSpaceForm";

const meta: Meta<typeof AddToSpaceForm> = {
  title: "Spaces/Add to space form",
  component: AddToSpaceForm,
  parameters: { layout: "padded" },
  args: {
    people: [
      { value: "2", label: "Alex Morgan" },
      { value: "3", label: "Priya Shah" },
    ],
    onSubmit: async () => ({ state: "success", message: { title: "Added" } }),
  },
};

export default meta;
type Story = StoryObj<typeof AddToSpaceForm>;

export const Default: Story = {};

/** Everybody in the organisation is in the space already. */
export const NobodyLeft: Story = { args: { people: [] } };

export const DarkMode: Story = { ...Default, globals: { colorScheme: "dark" } };
