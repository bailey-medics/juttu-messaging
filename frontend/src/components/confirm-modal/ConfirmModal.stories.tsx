/**
 * ConfirmModal Component Stories
 *
 * Demonstrates the ConfirmModal for destructive/irreversible actions:
 * - Default with all elements (icon + title + message)
 * - Title only (no icon)
 * - Icon only (no title)
 * - Loading state (accept in progress)
 * - Interactive demo with async handler
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { IconAlertTriangle } from "@/components/icons/appIcons";
import ConfirmModal from "./ConfirmModal";

const meta: Meta<typeof ConfirmModal> = {
  title: "Confirm modal/Confirm modal",
  component: ConfirmModal,
  parameters: { layout: "padded" },
  args: {
    opened: true,
    onClose: fn(),
    onAccept: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

/** Default - modal with icon, title, and message */
export const Default: Story = {
  args: {
    title: "Delete conversation",
    icon: <IconAlertTriangle />,
    acceptLabel: "Delete",
    submittingLabel: "Deleting…",
    children: "This will permanently delete the conversation. This action cannot be undone.",
  },
};

/** Title and message only (no icon) */
export const TitleOnly: Story = {
  args: {
    title: "Remove member",
    acceptLabel: "Remove",
    children: "Are you sure you want to remove this member? This action cannot be undone.",
  },
};

/** Icon and message only (no title) */
export const IconOnly: Story = {
  args: {
    icon: <IconAlertTriangle />,
    acceptLabel: "Leave",
    cancelLabel: "Stay",
    children: "You have unsaved changes that will be lost.",
  },
};

/**
 * A slow action - press Delete, and both buttons hold until it settles,
 * so the dialog cannot close over a delete still running
 */
export const SlowAction: Story = {
  args: {
    title: "Delete note",
    acceptLabel: "Delete",
    submittingLabel: "Deleting…",
    children: "This note will be deleted.",
    onAccept: () => new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  },
};

/** Dark mode variant */
export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
