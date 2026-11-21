/**
 * DataTable Storybook Stories
 *
 * Demonstrates the DataTable component with different data types,
 * states, and column configurations.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Container } from "@mantine/core";
import { ActiveStatusBadge } from "@/components/badge";
import BaseCard from "@/components/base-card/BaseCard";
import { StoryNote } from "@/stories/variants";
import DataTable, { type Column } from "./DataTable";

interface User {
  id: number;
  username: string;
  email: string;
}

interface Member {
  id: string;
  name: string;
  joined: string;
  role: string;
  status: "active" | "inactive";
}

const meta: Meta<typeof DataTable<User>> = {
  title: "Tables/Data table",
  component: DataTable,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <Container size="lg">
        <Story />
      </Container>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataTable<User>>;

const sampleUsers: User[] = [
  { id: 1, username: "alice.smith", email: "alice@example.com" },
  { id: 2, username: "bob.jones", email: "bob@example.com" },
  { id: 3, username: "charlie.brown", email: "charlie@example.com" },
  { id: 4, username: "diana.prince", email: "diana@example.com" },
];

const userColumns: Column<User>[] = [
  {
    header: "Username",
    render: (user) => user.username,
  },
  {
    header: "Email",
    render: (user) => user.email,
  },
  {
    header: "User ID",
    render: (user) => String(user.id),
  },
];

/**
 * Default DataTable
 *
 * Shows the table with user data and basic columns.
 */
export const Default: Story = {
  args: {
    data: sampleUsers,
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
  },
};

/**
 * With Member Data
 *
 * Demonstrates the table with a space's members, including a status badge
 * column.
 */
export const WithMemberData: StoryObj<typeof DataTable<Member>> = {
  args: {
    data: [
      {
        id: "m-001",
        name: "John Doe",
        joined: "2026-03-15",
        role: "Owner",
        status: "active",
      },
      {
        id: "m-002",
        name: "Jane Smith",
        joined: "2026-07-22",
        role: "Member",
        status: "active",
      },
      {
        id: "m-003",
        name: "Robert Johnson",
        joined: "2026-11-30",
        role: "Member",
        status: "inactive",
      },
    ],
    columns: [
      {
        header: "Name",
        render: (member) => member.name,
      },
      {
        header: "Joined",
        render: (member) => member.joined,
      },
      {
        header: "Role",
        render: (member) => member.role,
      },
      {
        header: "Member ID",
        render: (member) => member.id,
      },
      {
        header: "Status",
        render: (member) => <ActiveStatusBadge active={member.status === "active"} />,
      },
    ],
    onRowClick: fn(),
    getRowKey: (member) => member.id,
  },
};

/**
 * Many Rows
 *
 * Shows the table with more data to demonstrate scrolling behavior.
 */
export const ManyRows: Story = {
  args: {
    data: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
    })),
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
  },
};

/**
 * Long Text
 *
 * Tests how the table handles cells with very long text content.
 */
// cspell:disable
export const LongText: Story = {
  args: {
    data: [
      {
        id: 1,
        username: "superlongusernamethatjustkeepsgoingandgoingwithoutanybreaks",
        email:
          "a.very.long.email.address.that.goes.on.and.on@extremely-long-domain-name-example.co.uk",
      },
      {
        id: 2,
        username: "normaluser",
        email: "normal@example.com",
      },
      {
        id: 3,
        username: "Dr. Bartholomew Featherstonehaugh-Worthington III",
        email:
          "bartholomew.featherstonehaugh-worthington@prestigious-research-institution.example.org",
      },
    ],
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
  },
};
// cspell:enable

/**
 * Narrow header in a card
 *
 * A table in a BaseCard inherits the card's "break anywhere" wrapping. A
 * header in a column narrower than its words wraps between them and
 * never inside one: the column grows to fit its longest word.
 */
export const NarrowHeaderInACard: Story = {
  args: {
    data: sampleUsers,
    columns: [
      {
        header: "Username",
        render: (user) => user.username,
        accessor: (user) => user.username,
      },
      {
        header: "Email",
        render: (user) => user.email,
        accessor: (user) => user.email,
      },
      {
        header: "Authorised here",
        width: "140px",
        render: (user) => String(user.id),
        accessor: (user) => user.id,
      },
    ],
    getRowKey: (user) => user.id,
  },
  render: (args) => (
    <BaseCard>
      <DataTable {...args} />
    </BaseCard>
  ),
};

interface Agent {
  id: number;
  name: string;
  handle: string;
  team: string;
  owner: string;
  added: string;
  lastPosted: string;
  status: "active" | "inactive";
}

const agents: Agent[] = [
  {
    id: 1,
    name: "Alice Smith",
    handle: "@agent-19",
    team: "Release",
    owner: "Sam Okafor",
    added: "2026-09-28",
    lastPosted: "2026-10-04",
    status: "active",
  },
  {
    id: 2,
    name: "Bob Jones",
    handle: "@agent-20",
    team: "Docs",
    owner: "Alex Reilly",
    added: "2026-09-30",
    lastPosted: "2026-10-02",
    status: "inactive",
  },
  {
    id: 3,
    name: "Charlie Brown",
    handle: "@agent-21",
    team: "Release",
    owner: "Ama Diallo",
    added: "2026-10-01",
    lastPosted: "2026-10-06",
    status: "active",
  },
];

const sevenColumns: Column<Agent>[] = [
  { header: "Name", render: (a) => a.name, accessor: (a) => a.name },
  { header: "Handle", render: (a) => a.handle },
  { header: "Team", render: (a) => a.team, accessor: (a) => a.team },
  { header: "Owner", render: (a) => a.owner },
  {
    header: "Added",
    render: (a) => a.added,
    accessor: (a) => a.added,
  },
  { header: "Last posted", render: (a) => a.lastPosted },
  {
    header: "Status",
    render: (a) => <ActiveStatusBadge active={a.status === "active"} />,
  },
];

const threeColumns: Column<Agent>[] = sevenColumns.filter((c) =>
  ["Name", "Team", "Status"].includes(c.header),
);

/**
 * Seven columns in a 40rem space. Seven columns need 56rem at the
 * default 8rem each, so the table draws cards. Widen the Storybook
 * canvas and nothing changes: the container, not the screen, is what is
 * measured.
 */
export const SevenColumnsInANarrowSpace: StoryObj<typeof DataTable<Agent>> = {
  render: () => (
    <div>
      <Container size={40 * 16} px={0}>
        <DataTable
          data={agents}
          columns={sevenColumns}
          onRowClick={fn()}
          getRowKey={(a) => a.id}
        />
      </Container>
      <StoryNote mt="xs">
        Container constrained to 40rem: seven columns do not fit, so cards
      </StoryNote>
    </div>
  ),
};

/**
 * Three columns in the same 40rem space. Three columns need 24rem, which
 * fits, so this stays a table where the one above became cards.
 */
export const ThreeColumnsInANarrowSpace: StoryObj<typeof DataTable<Agent>> = {
  render: () => (
    <div>
      <Container size={40 * 16} px={0}>
        <DataTable
          data={agents}
          columns={threeColumns}
          onRowClick={fn()}
          getRowKey={(a) => a.id}
        />
      </Container>
      <StoryNote mt="xs">The same 40rem: three columns fit, so still a table</StoryNote>
    </div>
  ),
};

/**
 * Seven columns at the full width of the page container. Drag the
 * Storybook canvas narrower than about 56rem and it switches to cards;
 * widen it past 58rem and it comes back, the 2rem margin stopping it
 * flickering at the edge.
 */
export const SevenColumnsAtFullWidth: StoryObj<typeof DataTable<Agent>> = {
  render: () => (
    <div>
      <DataTable
        data={agents}
        columns={sevenColumns}
        onRowClick={fn()}
        getRowKey={(a) => a.id}
      />
      <StoryNote mt="xs">
        Shrink the canvas below about 56rem to see the switch to cards
      </StoryNote>
    </div>
  ),
};

/**
 * Error State
 *
 * Shows an error alert when data fails to load.
 */
export const Error: Story = {
  args: {
    data: [],
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
    error: "Failed to load users from the server",
  },
};

/**
 * Loading State
 *
 * Shows skeleton loaders while data is being fetched.
 */
export const Loading: Story = {
  args: {
    data: [],
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
    loading: true,
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

export const DarkModeLoading: Story = {
  ...Loading,
  globals: { colorScheme: "dark" },
};
