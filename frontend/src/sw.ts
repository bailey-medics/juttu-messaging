/// <reference lib="webworker" />

/**
 * Juttu's service worker, built by vite-plugin-pwa into `/sw.js`.
 *
 * Ported from Quill Medical's. The rules for what may come from the cache
 * live in `src/pwa/cachingRules.ts`, with their tests; this file only wires
 * them to Workbox. What a push shows, and where tapping it goes, live in
 * `src/pwa/pushMessages.ts`, with their tests.
 */

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

import { cachingRuleFor, OFFLINE_PAGE, type RequestFacts } from "@/pwa/cachingRules";
import { notificationFor, openIn, urlOf } from "@/pwa/pushMessages";

declare let self: ServiceWorkerGlobalScope;

/** The facts the rules need, from a request this worker has been handed. */
function factsOf(request: Request, url: URL): RequestFacts {
  return { url, mode: request.mode, origin: self.location.origin };
}

// Take control of open pages as soon as this worker activates. A new worker
// still waits to activate until the page posts SKIP_WAITING, below.
clientsClaim();

// Drop the precache entries an older build stored.
cleanupOutdatedCaches();

const network = new NetworkOnly();

// Workbox uses the first route that matches, so these two come before the
// precache. Otherwise a precached index.html would answer page loads from
// the cache first.
registerRoute(
  ({ request, url }) => cachingRuleFor(factsOf(request, url)) === "network-only",
  network,
);

registerRoute(
  ({ request, url }) => cachingRuleFor(factsOf(request, url)) === "network-first-offline-page",
  async (options) => {
    try {
      return await network.handle(options);
    } catch {
      return (await matchPrecache(OFFLINE_PAGE)) ?? Response.error();
    }
  },
);

// The built files, stored when this worker installs. vite-plugin-pwa writes
// the list into `self.__WB_MANIFEST` at build time.
precacheAndRoute(self.__WB_MANIFEST);

// The page may tell a waiting worker to take over, for an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

// A push from the backend: show it. The backend sends none to somebody
// looking at the conversation, so every push is shown.
self.addEventListener("push", (event) => {
  let payload: unknown = null;
  try {
    payload = event.data?.json();
  } catch {
    // Shown as a plain "Juttu" notification below.
  }

  const { title, options } = notificationFor(payload, "/android-chrome-192x192.png");
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping a notification opens its conversation, in the app if it is open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) =>
        openIn(
          urlOf(event.notification.data),
          windows,
          (url) => self.clients.openWindow(url),
          self.location.origin,
        ),
      ),
  );
});
