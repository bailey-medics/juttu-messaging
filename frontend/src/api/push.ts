/**
 * Push notifications: the backend's `/api/push/...` routes.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";

/** The public key a browser subscribes with, or null while push is off. */
export async function getPushKey(): Promise<string | null> {
  const body = await apiRequest("GET", "/push/key");

  if (!isRecord(body) || !(typeof body.public_key === "string" || body.public_key === null)) {
    throw new ApiError(502, "The backend's answer about notifications was not understood");
  }

  return body.public_key;
}

/** Store this browser's subscription for the person signed in. */
export async function saveSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  // Only the fields the backend stores: it refuses any others.
  await apiRequest("POST", "/push/subscriptions", {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth },
  });
}

/** Forget this browser's subscription for the person signed in. */
export async function forgetSubscription(endpoint: string): Promise<void> {
  await apiRequest("POST", "/push/subscriptions/remove", { endpoint });
}

/** Say whether the person has conversation *conversationId* on screen. */
export async function sayLooking(conversationId: number, looking: boolean): Promise<void> {
  await apiRequest("POST", "/push/looking", { conversation: conversationId, looking });
}

/** What sends the person a push. Quiet unless they choose otherwise. */
export type NotifyLevel = "quiet" | "everything" | "nothing";

function isNotifyLevel(value: unknown): value is NotifyLevel {
  return value === "quiet" || value === "everything" || value === "nothing";
}

function levelFrom(body: unknown): NotifyLevel {
  if (!isRecord(body) || !isNotifyLevel(body.level)) {
    throw new ApiError(502, "The backend's answer about notifications was not understood");
  }

  return body.level;
}

/** What the person has chosen to be notified about. */
export async function getNotifyLevel(): Promise<NotifyLevel> {
  return levelFrom(await apiRequest("GET", "/push/settings"));
}

/** Change what the person is notified about, on every device. */
export async function setNotifyLevel(level: NotifyLevel): Promise<NotifyLevel> {
  return levelFrom(await apiRequest("POST", "/push/settings", { level }));
}
