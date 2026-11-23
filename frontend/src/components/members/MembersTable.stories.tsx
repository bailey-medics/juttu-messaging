/** The members table, as an organisation admin sees it. The people are made up. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { Member } from "@/api/members";

import MembersTable from "./MembersTable";

const members: Member[] = [
  { id: 2, username: "alex", name: "Alex Morgan", is_admin: false },
  { id: 3, username: "priya", name: "Priya Shah", is_admin: true },
  { id: 1, username: "sam", name: "Sam Patel", is_admin: true },
];

const meta: Meta<typeof MembersTable> = {
  title: "Members/Members table",
  component: MembersTable,
  parameters: { layout: "padded" },
  args: { members, currentUserId: 1, onMakeAdmin: fn(), onRemove: fn() },
};

export default meta;
type Story = StoryObj<typeof MembersTable>;

/** Sam is looking: their own row offers no "Remove". */
export const Default: Story = {};

export const Loading: Story = { args: { members: [], loading: true } };

export const Failed: Story = {
  args: { members: [], error: "Could not load the members. Try again." },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
