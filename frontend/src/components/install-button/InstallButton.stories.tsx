import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import InstallButton from "@/components/install-button/InstallButton";
import { createInstallPromptCapture } from "@/pwa/installPrompt";

/** A store that has been offered an install, as Chrome would offer one. */
function offeredCapture() {
  const capture = createInstallPromptCapture();
  const target = new EventTarget();
  capture.wire(target);
  target.dispatchEvent(
    Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    }),
  );

  return capture;
}

const meta = {
  title: "Components/InstallButton",
  component: InstallButton,
  // The button sits on the header's teal, so it is drawn on it here too.
  decorators: [
    (Story) => (
      <Box bg="primary.8" p="md">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof InstallButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The browser has offered an install, so the button shows. */
export const Offered: Story = { args: { capture: offeredCapture() } };

/** No offer: Safari, or Juttu already installed. Nothing shows. */
export const NotOffered: Story = { args: { capture: createInstallPromptCapture() } };
