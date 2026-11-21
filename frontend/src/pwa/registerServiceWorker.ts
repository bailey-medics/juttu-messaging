/**
 * Registers the service worker, `/sw.js`, in a production build.
 *
 * Not in development: Vite's dev server serves modules one by one, and a
 * worker caching them would serve a stale copy after an edit.
 */

/** `ServiceWorkerContainer.register`, as far as this uses it. */
export type RegisterScript = (scriptUrl: string) => Promise<unknown>;

/** What this needs from the browser, so a test can hand in its own. */
export interface ServiceWorkerHost {
  navigator: { serviceWorker?: { register: RegisterScript } };
  addEventListener: (type: "load", listener: () => void) => void;
}

/**
 * Register `/sw.js` once the page has loaded, so the worker's own downloads
 * do not compete with the page's.
 *
 * @returns false when nothing was registered: a development build, or a
 *   browser with no service workers.
 */
export function registerServiceWorker(host: ServiceWorkerHost, isProduction: boolean): boolean {
  const container = host.navigator.serviceWorker;

  if (!isProduction || container === undefined) {
    return false;
  }

  host.addEventListener("load", () => {
    container.register("/sw.js").catch((error: unknown) => {
      console.error("The service worker could not be registered:", error);
    });
  });

  return true;
}
