import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";

import { API_SUCCESS_EVENT, NETWORK_ERROR_EVENT } from "@/api/client";

import MainLayout from "@/components/layouts/MainLayout";
import { BodyText, PageHeader } from "@/components/typography";
import { ConnectivityProvider } from "@/connectivity";

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

/**
 * Says the backend answered once, then that it could not be reached, as
 * `apiRequest` does when the connection drops.
 */
function LoseTheConnection() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(API_SUCCESS_EVENT));
    window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT));
  }, []);

  return null;
}

/**
 * The backend cannot be reached: the offline strip, with when Juttu last
 * synced, and after a second the offline modal, as in Quill Medical.
 */
export const Offline: Story = {
  decorators: [
    (Story) => (
      <ConnectivityProvider>
        <LoseTheConnection />
        <Story />
      </ConnectivityProvider>
    ),
  ],
};
