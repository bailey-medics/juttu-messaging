/**
 * What the service worker does with a push, kept apart from `sw.ts` so it
 * can be tested.
 */

/**
 * Whether *value* is an object with string keys. Its own copy, not the
 * API client's: the service worker has no page, and the client reads its
 * cookies.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A notification to show, as `showNotification` takes it. */
export interface ShownNotification {
  title: string;
  options: NotificationOptions;
}

/** The address a notification opens: a path in this app, or the home page. */
export function urlOf(data: unknown): string {
  const url = isRecord(data) ? data.url : undefined;

  // Only a path inside the app, never another site.
  return typeof url === "string" && /^\/(?![/\\])/.test(url) ? url : "/";
}

/**
 * The notification for one push. A push that cannot be read still shows
 * something: Safari withdraws a subscription that receives pushes without
 * showing them.
 */
export function notificationFor(payload: unknown, icon: string): ShownNotification {
  const push = isRecord(payload) ? payload : {};
  const title = typeof push.title === "string" && push.title !== "" ? push.title : "Juttu";
  const body = typeof push.body === "string" ? push.body : "";
  const tag = typeof push.tag === "string" ? push.tag : undefined;

  return {
    title,
    options: { body, tag, icon, badge: icon, data: { url: urlOf(push.data) } },
  };
}

/** A window of this app, as `clients.matchAll` gives it. */
export interface AppWindow {
  url: string;
  focus: () => Promise<unknown>;
  navigate: (url: string) => Promise<unknown>;
}

/**
 * Open *path*: in a window of the app that is already open, if there is
 * one, or in a new one.
 */
export async function openIn(
  path: string,
  windows: readonly AppWindow[],
  openWindow: (url: string) => Promise<unknown>,
  origin: string,
): Promise<void> {
  const target = new URL(path, origin).href;
  const open = windows[0];

  if (open === undefined) {
    await openWindow(target);
    return;
  }

  await open.focus();
  if (open.url !== target) {
    await open.navigate(target);
  }
}
