import { useSyncExternalStore } from "react";

import { installPromptCapture, type InstallPromptCapture } from "@/pwa/installPrompt";

/** What the install button needs to know, and the one thing it can do. */
export interface InstallPromptState {
  /** True when the browser has offered an install that has not been used. */
  canInstall: boolean;
  /** Open the browser's own install dialog. */
  install: () => Promise<void>;
}

/**
 * Whether the browser has offered to install Juttu, from the store
 * `main.tsx` wires at start-up.
 *
 * @param capture The store to read. Tests and stories pass their own.
 */
export function useInstallPrompt(
  capture: InstallPromptCapture = installPromptCapture,
): InstallPromptState {
  const prompt = useSyncExternalStore(capture.subscribe, capture.getDeferredPrompt);

  return {
    canInstall: prompt !== null,
    install: async () => {
      if (prompt === null) {
        return;
      }

      // A prompt can be shown only once, so it is forgotten as it is used.
      capture.clearDeferredPrompt();
      await prompt.prompt();
    },
  };
}
