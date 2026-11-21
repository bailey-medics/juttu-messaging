import type { Meta, StoryObj } from "@storybook/react-vite";

import RibbonInbox from "@/components/inbox/RibbonInbox";
import TopRibbon from "@/components/ribbon/TopRibbon";

const meta = {
  title: "Inbox/Ribbon inbox",
  component: RibbonInbox,
  decorators: [(Story) => <TopRibbon rightSection={Story()} />],
} satisfies Meta<typeof RibbonInbox>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Three things waiting: the amber envelope with its count. */
export const Waiting: Story = { args: { count: 3 } };

/** Nothing waiting: the envelope sits back in grey. */
export const NothingWaiting: Story = { args: { count: 0 } };

/** Nobody signed in: no envelope at all. */
export const SignedOut: Story = {};

export const DarkMode: Story = { args: { count: 3 }, globals: { colorScheme: "dark" } };
