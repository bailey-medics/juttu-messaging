/**
 * Subscribing this device to push notifications, and unsubscribing it.
 * Ported from Quill Medical's `EnableNotificationsButton`.
 */

import { forgetSubscription, getPushKey, saveSubscription } from "@/api/push";

/** Where this device stands on push notifications. */
export type PushState =
  /** The browser cannot receive them, such as Safari outside an installed app. */
  | "unsupported"
  /** The server has no signing keys, so nothing would be sent. */
  | "off"
  /** The person has refused them for this site, in the browser's settings. */
  | "denied"
  /** Not subscribed yet. */
  | "available"
  /** Subscribed. */
  | "on";

/** A browser's `PushSubscription`, as far as this uses it. */
export interface DeviceSubscription {
  endpoint: string;
  toJSON: () => PushSubscriptionJSON;
  unsubscribe: () => Promise<boolean>;
}

/** A browser's `PushManager`, as far as this uses it. */
export interface DevicePushManager {
  getSubscription: () => Promise<DeviceSubscription | null>;
  subscribe: (options: PushSubscriptionOptionsInit) => Promise<DeviceSubscription>;
}

/** What this needs from the browser, so a test can hand in its own. */
export interface PushHost {
  notificationPermission: () => NotificationPermission | undefined;
  requestPermission: () => Promise<NotificationPermission>;
  pushManager: () => Promise<DevicePushManager | undefined>;
}

/** The real browser's. */
export const browserPush: PushHost = {
  notificationPermission: () =>
    typeof Notification === "undefined" ? undefined : Notification.permission,
  requestPermission: () => Notification.requestPermission(),
  pushManager: async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return undefined;
    }

    const registration = await navigator.serviceWorker.ready;

    return registration.pushManager;
  },
};

/** A URL-safe base64 key as the bytes `PushManager.subscribe` takes. */
export function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));

  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }

  return bytes;
}

/** Where this device stands now. Asks the server only when it must. */
export async function pushState(host: PushHost): Promise<PushState> {
  const permission = host.notificationPermission();
  if (permission === undefined || typeof PushManager === "undefined") {
    return "unsupported";
  }

  if (permission === "denied") {
    return "denied";
  }

  if ((await getPushKey()) === null) {
    return "off";
  }

  const manager = await host.pushManager();
  if (manager === undefined) {
    return "unsupported";
  }

  return (await manager.getSubscription()) === null ? "available" : "on";
}

/**
 * Ask the person, subscribe this device, and tell the server.
 *
 * @returns where the device stands afterwards.
 */
export async function enablePush(host: PushHost): Promise<PushState> {
  const permission = await host.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "available";
  }

  const key = await getPushKey();
  if (key === null) {
    return "off";
  }

  const manager = await host.pushManager();
  if (manager === undefined) {
    return "unsupported";
  }

  const subscription = await manager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(key),
  });
  await saveSubscription(subscription.toJSON());

  return "on";
}

/**
 * Stop this device being sent pushes: the server forgets it, then the
 * browser drops it. Called before signing out, while the session still
 * lets the server be told. Never throws: signing out must still happen.
 */
export async function disablePush(host: PushHost): Promise<void> {
  try {
    if (host.notificationPermission() === undefined) {
      return;
    }

    const manager = await host.pushManager();
    const subscription = await manager?.getSubscription();
    if (!subscription) {
      return;
    }

    await forgetSubscription(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe();
  } catch {
    // Nothing more can be done from here; the server drops a subscription
    // once its push service says it has gone.
  }
}
