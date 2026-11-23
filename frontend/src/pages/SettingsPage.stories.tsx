import type { Meta, StoryObj } from "@storybook/react-vite";

import SettingsPage from "@/pages/SettingsPage";
import { createInstallPromptCapture } from "@/pwa/installPrompt";
import type { InstallEnvironment } from "@/pwa/installRoute";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/** A browser of this user agent, which has not offered an install prompt. */
function browser(userAgent: string, isStandalone = false) {
  return (hasDeferredPrompt: boolean): InstallEnvironment => ({
    userAgent,
    maxTouchPoints: 5,
    hasDeferredPrompt,
    isStandalone,
  });
}

/**
 * Storybook has no backend, so the page's requests for the notification
 * setting answer "quiet". It puts the real `fetch` back afterwards.
 */
function answerQuiet() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ level: "quiet" }), { status: 200 });

  return () => {
    globalThis.fetch = realFetch;
  };
}

const meta = {
  title: "Pages/SettingsPage",
  component: SettingsPage,
  beforeEach: answerQuiet,
  args: { capture: createInstallPromptCapture() },
} satisfies Meta<typeof SettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Chrome on a computer, before it offers a prompt: "Install Juttu" opens its menu's steps. */
export const InChrome: Story = {
  args: { readEnvironment: browser(CHROME) },
};

/** Safari on an iPhone: "Install Juttu" opens the share menu's steps. */
export const OnAnIPhone: Story = {
  args: { readEnvironment: browser(IPHONE_SAFARI) },
};

/** Running as the installed app: the install card is gone. */
export const Installed: Story = {
  args: { readEnvironment: browser(CHROME, true) },
};
