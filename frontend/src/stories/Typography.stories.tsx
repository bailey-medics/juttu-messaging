/**
 * Foundations: Juttu's type scale, from `typographyTokens` in `theme.ts`.
 *
 * Every size is fixed on every screen. Body text is 19px.
 */

import { Stack, Text, Title } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { typographyTokens } from "@/theme";

const HEADINGS = [1, 2, 3, 4, 5, 6] as const;

function Typography() {
  return (
    <Stack gap="lg">
      {HEADINGS.map((order) => (
        <Title key={order} order={order}>
          Heading {order}, {typographyTokens.headings[`h${order}`].fontSize}
        </Title>
      ))}
      <Text className="lead-text">A lead paragraph, 26px, opens a page.</Text>
      <Text>Body text is 19px on every screen, so it reads the same on a phone.</Text>
      <Text size="sm" c="dimmed">
        Small text, 16px, for captions and metadata.
      </Text>
    </Stack>
  );
}

const meta = {
  title: "Foundations/Typography",
  component: Typography,
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Scale: Story = {};
