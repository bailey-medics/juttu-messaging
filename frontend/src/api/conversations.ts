/**
 * Conversations in a space, and their messages: the backend's
 * `/api/spaces/{id}/conversations` and `/api/conversations/{id}/messages`.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";
import { listOf } from "@/api/spaces";

export interface ConversationSummary {
  id: number;
  kind: "channel" | "direct";
  /** A channel's name, or the other people in a direct conversation. */
  title: string;
}

export interface ChatMessage {
  id: number;
  author: { id: number; name: string };
  body: string;
  created_at: string;
  /** The message this one corrects, if it is a correction. */
  amends: number | null;
}

export function isConversationSummary(value: unknown): value is ConversationSummary {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    (value.kind === "channel" || value.kind === "direct") &&
    typeof value.title === "string"
  );
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value) || !isRecord(value.author)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.author.id === "number" &&
    typeof value.author.name === "string" &&
    typeof value.body === "string" &&
    typeof value.created_at === "string" &&
    (value.amends === null || typeof value.amends === "number")
  );
}

function notUnderstood(): ApiError {
  return new ApiError(502, "The backend's answer about conversations was not understood");
}

/** The channels in a space, and the caller's own direct conversations. */
export async function listConversations(spaceId: number): Promise<ConversationSummary[]> {
  const body = await apiRequest("GET", `/spaces/${spaceId}/conversations`);

  return listOf(body, "conversations", isConversationSummary);
}

/** Open a channel in a space. */
export async function startChannel(
  spaceId: number,
  name: string,
): Promise<ConversationSummary> {
  const body = await apiRequest("POST", `/spaces/${spaceId}/conversations`, {
    kind: "channel",
    name,
  });

  if (!isConversationSummary(body)) {
    throw notUnderstood();
  }

  return body;
}

/** Start a direct conversation with people in the space. */
export async function startDirect(
  spaceId: number,
  userIds: number[],
): Promise<ConversationSummary> {
  const body = await apiRequest("POST", `/spaces/${spaceId}/conversations`, {
    kind: "direct",
    user_ids: userIds,
  });

  if (!isConversationSummary(body)) {
    throw notUnderstood();
  }

  return body;
}

/** The latest messages in a conversation, oldest first. */
export async function listMessages(conversationId: number): Promise<ChatMessage[]> {
  const body = await apiRequest("GET", `/conversations/${conversationId}/messages`);

  return listOf(body, "messages", isChatMessage);
}

/** Send a message. */
export async function sendMessage(conversationId: number, text: string): Promise<ChatMessage> {
  const body = await apiRequest("POST", `/conversations/${conversationId}/messages`, {
    body: text,
  });

  if (!isChatMessage(body)) {
    throw notUnderstood();
  }

  return body;
}
