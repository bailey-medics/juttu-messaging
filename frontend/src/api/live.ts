/**
 * Live delivery: the backend's `GET /api/events` stream of new messages.
 */

import { isRecord } from "@/api/client";
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

/** A stream event's data as a new message, or null if it is not one. */
export function liveMessageFrom(data: unknown): LiveMessage | null {
  if (typeof data !== "string") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(data);

    return isLiveMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
