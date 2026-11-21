/**
 * Which requests the service worker may answer from its cache.
 *
 * Kept apart from `src/sw.ts`, which only wires these rules to Workbox, so
 * that they can be tested without a service worker.
 *
 * The rules, most important first:
 *
 * 1. **An API request is never cached.** `/api/` answers are live data, and
 *    an old copy shown as though it were current is worse than an error. The
 *    worker leaves them to the network.
 * 2. **A page load tries the network first.** When the network fails, the
 *    worker shows `/offline.html`, Juttu's own page saying it is offline,
 *    instead of the browser's.
 * 3. **The app's own files come from the precache**, the list of built files
 *    the worker stores when it installs. Their names change with their
 *    content, so a stored copy is never out of date.
 * 4. **Anything else is left to the network.**
 */

/** The page the worker shows when a page load cannot reach the network. */
export const OFFLINE_PAGE = "/offline.html";

/** How the service worker treats one request. */
export type CachingRule = "network-only" | "network-first-offline-page" | "precache";

/** The parts of a request the rules look at. */
export interface RequestFacts {
  url: URL;
  /** `Request.mode`: "navigate" for a page load. */
  mode: string;
  /** The service worker's own origin. */
  origin: string;
}

/** Whether a request is for Juttu's API. */
export function isApiRequest({ url, origin }: RequestFacts): boolean {
  return url.origin === origin && (url.pathname === "/api" || url.pathname.startsWith("/api/"));
}

/** Decide how the service worker treats one request. */
export function cachingRuleFor(request: RequestFacts): CachingRule {
  if (isApiRequest(request)) {
    return "network-only";
  }

  if (request.mode === "navigate" && request.url.origin === request.origin) {
    return "network-first-offline-page";
  }

  if (request.url.origin === request.origin) {
    return "precache";
  }

  return "network-only";
}
