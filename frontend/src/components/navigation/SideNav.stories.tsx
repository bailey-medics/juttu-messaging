import type { Meta, StoryObj } from "@storybook/react-vite";

import SideNav from "@/components/navigation/SideNav";

const meta = {
  title: "Navigation/Side nav",
  component: SideNav,
  args: { showIcons: true },
  decorators: [(Story) => <div style={{ width: 260 }}>{Story()}</div>],
} satisfies Meta<typeof SideNav>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Juttu's entries, with the page you are on marked. */
export const Default: Story = {};

export const DarkMode: Story = { globals: { colorScheme: "dark" } };
