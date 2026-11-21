import { Box, Group, Stack } from "@mantine/core";

import { BodyText, BodyTextBold } from "@/components/typography";

export interface SwatchProps {
  /** What the colour is called, such as "primary.5". */
  name: string;
  /** The colour, as a hex value or a CSS variable. */
  colour: string;
  /** What the colour is for, in a few words. */
  use?: string;
}

/** One colour in the Foundations stories: a tile, its name and its use. */
export default function Swatch({ name, colour, use }: SwatchProps) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Box
        w={48}
        h={48}
        bg={colour}
        style={{ borderRadius: 8, border: "1px solid var(--mantine-color-gray-3)" }}
        aria-hidden
      />
      <Stack gap={0}>
        <BodyTextBold>{name}</BodyTextBold>
        <BodyText c="dimmed">{use ? `${colour}, ${use}` : colour}</BodyText>
      </Stack>
    </Group>
  );
}
