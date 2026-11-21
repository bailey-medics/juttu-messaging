/**
 * StatusStrip Component Stories
 *
 * Demonstrates the consolidated status strip in each of its states. In
 * Quill Medical these render inside the app's MainLayout, below the top
 * ribbon; Juttu shows the strip on its own until Phase 6 of the Quill
 * components plan brings MainLayout.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryNote } from "@/stories/variants";
import StatusStrip from "./StatusStrip";

const RESIZE_NOTE =
  "Only visible when more than one strip is showing at once: resize the browser narrower than the sm breakpoint (640px) to see these render as compact horizontal badges instead of full-width strips.";

const meta: Meta<typeof StatusStrip> = {
  title: "Overlays/Status strip",
  component: StatusStrip,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof StatusStrip>;

/** Offline - connectivity lost, shows the last successful sync time */
export const Offline: Story = {
  args: {
    variant: "offline",
    lastSyncedAt: new Date(),
  },
  render: (args) => (
    <>
      <StatusStrip {...args} />
      <StoryNote>
        A lone strip always stays full-width, even on mobile - only switches to a badge when
        stacked alongside another strip.
      </StoryNote>
    </>
  ),
};

/** Reconnected - brief confirmation after connectivity returns */
export const Reconnected: Story = {
  args: {
    variant: "reconnected",
  },
  render: (args) => (
    <>
      <StatusStrip {...args} />
    </>
  ),
};

/** Updating - a contract-step forced reload is imminent */
export const Updating: Story = {
  args: {
    variant: "updating",
  },
  render: (args) => (
    <>
      <StatusStrip {...args} />
    </>
  ),
};

/** Fallback - the automatic forced reload didn't resolve the mismatch; keeps retrying in the background */
export const Fallback: Story = {
  args: {
    variant: "fallback",
  },
  render: (args) => (
    <>
      <StatusStrip {...args} />
    </>
  ),
};

/**
 * Two strips stacked - e.g. offline while a forced reload is also
 * pending. Each condition renders its own StatusStrip; they stack
 * vertically in mount order, with no priority given to either.
 */
export const TwoStripsStacked: Story = {
  render: () => (
    <>
      <StatusStrip variant="offline" lastSyncedAt={new Date()} multiple />
      <StatusStrip variant="updating" multiple />
      <StoryNote>{RESIZE_NOTE}</StoryNote>
    </>
  ),
};

/**
 * Three strips stacked - offline, an update that didn't apply
 * automatically, and (briefly) the updating notice. Demonstrates that
 * concurrent status conditions never overlap or compete for a single
 * slot - every condition gets its own strip.
 */
export const ThreeStripsStacked: Story = {
  render: () => (
    <>
      <StatusStrip variant="offline" lastSyncedAt={new Date()} multiple />
      <StatusStrip variant="updating" multiple />
      <StatusStrip variant="fallback" multiple />
      <StoryNote>{RESIZE_NOTE}</StoryNote>
    </>
  ),
};

/** Dark mode */
export const DarkMode: Story = {
  ...Offline,
  globals: { colorScheme: "dark" },
};
