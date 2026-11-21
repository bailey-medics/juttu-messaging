import type { Meta, StoryObj } from "@storybook/react-vite";

import MainLayout from "@/components/layouts/MainLayout";
import { BodyText, PageHeader } from "@/components/typography";

const meta = {
  title: "Layouts/Main layout",
  component: MainLayout,
  parameters: { layout: "fullscreen" },
  args: {
    children: (
      <>
        <PageHeader title="Home" />
        <BodyText>A quiet place for a team, its pipeline and its agents to talk.</BodyText>
      </>
    ),
  },
} satisfies Meta<typeof MainLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every page's frame: the ribbon, the side navigation and the page. */
export const Default: Story = {};

/** While a page loads: a skeleton, and "Loading" for a screen reader. */
export const Loading: Story = { args: { isLoading: true } };

export const DarkMode: Story = { globals: { colorScheme: "dark" } };
