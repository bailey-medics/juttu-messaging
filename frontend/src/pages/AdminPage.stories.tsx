import type { Meta, StoryObj } from "@storybook/react-vite";

import AdminPage from "@/pages/AdminPage";

const meta = {
  title: "Pages/AdminPage",
  component: AdminPage,
} satisfies Meta<typeof AdminPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The placeholder the Admin heading opens. */
export const Default: Story = {};
