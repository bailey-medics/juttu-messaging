/**
 * Live delivery: the backend's `GET /api/events` stream of new messages.
 */

import { isRecord } from "@/api/client";
import { isLivingCard, type LivingCard } from "@/api/cards";
import { isChatMessage, type ChatMessage } from "@/api/conversations";

/** One new message, as the stream announces it. */
export interface LiveMessage {
  conversation: number;
  space: number;
  message: ChatMessage;
}

export function isLiveMessage(value: unknown): value is LiveMessage {
  return (
    isRecord(value) &&
    typeof value.conversation === "number" &&
    typeof value.space === "number" &&
    isChatMessage(value.message)
  );
}

/**
 * The stream's address. *after* is the last message id the app had, so a
 * new stream opened after a failure is sent what was missed.
 */
export function eventsUrl(after: string): string {
  return after === "" ? "/api/events" : `/api/events?after=${encodeURIComponent(after)}`;
}

/** A card that changed, as the stream sends it: the card as it now stands. */
export interface LiveCard {
  conversation: number;
  space: number;
  card: LivingCard;
}

export function isLiveCard(value: unknown): value is LiveCard {
  return (
    isRecord(value) &&
    typeof value.conversation === "number" &&
    typeof value.space === "number" &&
    isLivingCard(value.card)
  );
}

function parsed(data: unknown): unknown {
  if (typeof data !== "string") {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** A stream event's data as a new message, or null if it is not one. */
export function liveMessageFrom(data: unknown): LiveMessage | null {
  const found = parsed(data);

  return isLiveMessage(found) ? found : null;
}

/** A stream event's data as a changed card, or null if it is not one. */
export function liveCardFrom(data: unknown): LiveCard | null {
  const found = parsed(data);

  return isLiveCard(found) ? found : null;
}
