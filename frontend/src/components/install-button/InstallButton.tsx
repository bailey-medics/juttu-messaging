import { Button } from "@mantine/core";

import type { InstallPromptCapture } from "@/pwa/installPrompt";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";

export interface InstallButtonProps {
  /** The install prompt store. Defaults to the one the app wires. */
  capture?: InstallPromptCapture;
}

/**
 * Offers to install Juttu as an app, when the browser allows it.
 *
 * It shows nothing until the browser fires `beforeinstallprompt`, which
 * Chrome, Edge and Samsung Internet do. Safari on an iPhone never does: there
 * Juttu is installed from the share menu, with "Add to Home Screen".
 */
export default function InstallButton({ capture }: InstallButtonProps) {
  const { canInstall, install } = useInstallPrompt(capture);

  if (!canInstall) {
    return null;
  }

  return (
    <Button variant="white" onClick={() => void install()}>
      Install Juttu
    </Button>
  );
}
