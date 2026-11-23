import { installPromptCapture, type InstallPromptCapture } from "@/pwa/installPrompt";
import {
  detectInstallRoute,
  readInstallEnvironment,
  type InstallEnvironment,
  type InstallRoute,
} from "@/pwa/installRoute";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";

export interface UseInstallRouteResult {
  /** How this device installs Juttu, or "installed" when it already runs as the app. */
  route: InstallRoute;
  /** Open the browser's own install dialog, on the "prompt" route. */
  install: () => Promise<void>;
}

/**
 * How this device installs Juttu, kept current as the browser offers a
 * prompt. Quill Medical's `useInstallRoute`, on Juttu's own install prompt
 * store, without Quill's record of a finished install: Juttu only offers
 * the install on its Settings page, so it has no reminder to stop.
 *
 * @param capture The install prompt store. Tests and stories pass their own.
 * @param readEnvironment Reads the browser. Tests pass a fixed environment.
 */
export function useInstallRoute(
  capture: InstallPromptCapture = installPromptCapture,
  readEnvironment: (hasDeferredPrompt: boolean) => InstallEnvironment = readInstallEnvironment,
): UseInstallRouteResult {
  const { canInstall, install } = useInstallPrompt(capture);

  return { route: detectInstallRoute(readEnvironment(canInstall)), install };
}
