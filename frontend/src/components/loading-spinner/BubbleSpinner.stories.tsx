import type { Meta, StoryObj } from "@storybook/react-vite";

import BubbleSpinner from "@/components/loading-spinner/BubbleSpinner";
import PageSpinner from "@/components/loading-spinner/PageSpinner";
import { StoryNote, VariantRow, VariantStack } from "@/stories/variants";

const meta = {
  title: "Feedback/Bubble spinner",
  component: BubbleSpinner,
} satisfies Meta<typeof BubbleSpinner>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The spinner for part of a page already showing. */
export const Default: Story = {};

/** The sizes it is used at: inside a page, and standing in for one. */
export const Sizes: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="4rem, inside a page">
        <BubbleSpinner />
      </VariantRow>
      <VariantRow label="8rem, for a whole page">
        <BubbleSpinner size="8rem" />
      </VariantRow>
    </VariantStack>
  ),
};

/** Where the wait stands in for the whole page. */
export const Page: Story = {
  render: () => (
    <>
      <PageSpinner />
      <StoryNote>
        Somebody whose device asks for less motion sees the three dots still.
      </StoryNote>
    </>
  ),
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
