/**
 * Foundations: Juttu's colours, in Quill Medical's palette.
 *
 * Every ramp in `brand.json`, the four brand colours and the status fills,
 * each with what it is for. Switch the toolbar to dark mode to see the navy
 * surfaces the dark scheme uses.
 */

import { Badge, Group, SimpleGrid, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading } from "@/components/typography";
import Swatch from "@/stories/Swatch";
import {
  brandColours,
  greyScale,
  primaryScale,
  secondaryScale,
  statusColourValues,
} from "@/theme";

const PRIMARY_USES = [
  "subtle backgrounds",
  "light tint, hover",
  "borders, disabled",
  "muted indicators",
  "links on white",
  "filled buttons",
  "card borders, dividers",
  "hover, pressed",
  "brand primary",
  "deepest navy",
];

const SECONDARY_USES = [
  "subtle amber backgrounds",
  "light amber fill",
  "amber borders",
  "decorative amber",
  "secondary amber",
  "brand amber",
  "prominent amber",
  "current link on white",
  "darker amber",
  "darkest amber",
];

/** A ramp of shades, each with its name and use. */
function Ramp({
  name,
  shades,
  uses,
}: {
  name: string;
  shades: readonly string[];
  uses: string[];
}) {
  return (
    <Stack gap="xs">
      <Heading>{name}</Heading>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {shades.map((shade, index) => (
          <Swatch key={shade} name={`${name}.${index}`} colour={shade} use={uses[index]} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function Colours() {
  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <Heading>Brand</Heading>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Swatch name="Primary" colour={brandColours.primary} use="navy" />
          <Swatch name="Secondary" colour={brandColours.secondary} use="amber" />
          <Swatch name="Background" colour={brandColours.background} use="the page" />
          <Swatch name="Mark" colour={brandColours.mark} use="the mark on navy" />
        </SimpleGrid>
      </Stack>
      <Ramp name="primary" shades={primaryScale} uses={PRIMARY_USES} />
      <Ramp name="secondary" shades={secondaryScale} uses={SECONDARY_USES} />
      <Ramp name="gray" shades={greyScale} uses={[]} />
      <Stack gap="xs">
        <Heading>Status</Heading>
        <Group gap="sm">
          {Object.entries(statusColourValues).map(([name, colour]) => (
            <Badge
              key={name}
              color={colour}
              c={name === "neutral" || name === "update" ? "var(--status-text-dark)" : "white"}
            >
              {name}
            </Badge>
          ))}
        </Group>
      </Stack>
    </Stack>
  );
}

const meta = {
  title: "Foundations/Colours",
  component: Colours,
} satisfies Meta<typeof Colours>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Palette: Story = {};
