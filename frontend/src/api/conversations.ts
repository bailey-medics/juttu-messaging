/**
 * Conversations and their messages: the backend's `/api/conversations`,
 * `/api/spaces/{id}/conversations` and `/api/conversations/{id}/messages`.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";
import { isSpaceKind, listOf, type SpaceKind } from "@/api/spaces";

/** The friendly icons a conversation may be given, by name. */
export const CONVERSATION_ICONS = [
  "anchor",
  "bolt",
  "cloud",
  "coffee",
  "compass",
  "flame",
  "leaf",
  "music",
  "planet",
  "rocket",
  "star",
  "sun",
] as const;

export type ConversationIconName = (typeof CONVERSATION_ICONS)[number];

export function isConversationIconName(value: unknown): value is ConversationIconName {
  return CONVERSATION_ICONS.some((name) => name === value);
}

export interface ConversationSummary {
  id: number;
  kind: "channel" | "direct";
  /** A channel's name, or the other people in a direct conversation. */
  title: string;
  /** Messages and new cards the person has not read yet. */
  unread_count: number;
  /** The icon picked for it at random, and kept. */
  icon: ConversationIconName;
  /** Which of the profile pictures' gradients the icon sits on. */
  icon_colour: number;
  /** Whether Home may show its people's circles. */
  shows_people: boolean;
  /** Where an uploaded icon is, which replaces the random one, or null. */
  icon_url: string | null;
}

/** A conversation as Home lists it, across every space. */
/** Somebody Home draws as a round icon with their initials. */
export interface ShownPerson {
  id: number;
  name: string;
}

/** The newest message or card change, as Home previews it. */
export interface LastItem {
  text: string;
  at: string;
}

export interface HomeConversation extends ConversationSummary {
  space: { id: number; name: string; kind: SpaceKind };
  /** When its newest message or card was made, or when it was started. */
  last_active_at: string;
  /** The newest message or card change, or null for neither. */
  last_item: LastItem | null;
  /** The others drawn as circles, or none, when it shows its icon instead. */
  people: ShownPerson[];
}

function isShownPerson(value: unknown): value is ShownPerson {
  return isRecord(value) && typeof value.id === "number" && typeof value.name === "string";
}

function isLastItem(value: unknown): value is LastItem {
  return isRecord(value) && typeof value.text === "string" && typeof value.at === "string";
}

export interface ChatMessage {
  id: number;
  author: { id: number; name: string };
  body: string;
  created_at: string;
  /** The message this one corrects, if it is a correction. */
  amends: number | null;
  /** The top-level message whose thread this reply is in, if it is a reply. */
  thread: number | null;
  /** How many replies hang off this message. */
  reply_count: number;
}

export function isConversationSummary(value: unknown): value is ConversationSummary {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    (value.kind === "channel" || value.kind === "direct") &&
    typeof value.title === "string" &&
    typeof value.unread_count === "number" &&
    isConversationIconName(value.icon) &&
    typeof value.icon_colour === "number" &&
    typeof value.shows_people === "boolean" &&
    (value.icon_url === null || typeof value.icon_url === "string")
  );
}

export function isHomeConversation(value: unknown): value is HomeConversation {
  if (!isRecord(value) || !isConversationSummary(value)) {
    return false;
  }

  const record: Record<string, unknown> = value;

  return (
    isRecord(record.space) &&
    typeof record.space.id === "number" &&
    typeof record.space.name === "string" &&
    isSpaceKind(record.space.kind) &&
    typeof record.last_active_at === "string" &&
    (record.last_item === null || isLastItem(record.last_item)) &&
    Array.isArray(record.people) &&
    record.people.every(isShownPerson)
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
    (value.amends === null || typeof value.amends === "number") &&
    (value.thread === null || typeof value.thread === "number") &&
    typeof value.reply_count === "number"
  );
}

function notUnderstood(): ApiError {
  return new ApiError(502, "The backend's answer about conversations was not understood");
}

/** Every conversation the caller may read, most recently active first. */
export async function listMyConversations(): Promise<HomeConversation[]> {
  const body = await apiRequest("GET", "/conversations");

  return listOf(body, "conversations", isHomeConversation);
}

/** One conversation the caller may read. */
export async function getConversation(id: number): Promise<ConversationSummary> {
  const body = await apiRequest("GET", `/conversations/${id}`);

  if (!isConversationSummary(body)) {
    throw new ApiError(502, "The backend's answer about a conversation was not understood");
  }

  return body;
}

/** Show or hide a channel's people's circles on Home, for everybody. Admins only. */
export async function setShowsPeople(
  id: number,
  showsPeople: boolean,
): Promise<ConversationSummary> {
  const body = await apiRequest("POST", `/conversations/${id}/shows-people`, {
    shows_people: showsPeople,
  });

  if (!isConversationSummary(body)) {
    throw new ApiError(502, "The backend's answer about a conversation was not understood");
  }

  return body;
}

/** A conversation, from an answer that should be one. */
function conversationFrom(body: unknown): ConversationSummary {
  if (!isConversationSummary(body)) {
    throw new ApiError(502, "The backend's answer about a conversation was not understood");
  }

  return body;
}

/** Make *image* a conversation's icon, in place of its random one. Admins only. */
export async function uploadConversationIcon(
  id: number,
  image: File,
): Promise<ConversationSummary> {
  const form = new FormData();
  form.append("image", image);

  return conversationFrom(await apiRequest("PUT", `/conversations/${id}/icon`, form));
}

/** Take a conversation's uploaded icon away, so its random one shows. Admins only. */
export async function removeConversationIcon(id: number): Promise<ConversationSummary> {
  return conversationFrom(await apiRequest("DELETE", `/conversations/${id}/icon`));
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

/** Send a message, or a reply in the thread of message *thread*. */
export async function sendMessage(
  conversationId: number,
  text: string,
  thread?: number,
): Promise<ChatMessage> {
  const payload = thread === undefined ? { body: text } : { body: text, thread };
  const body = await apiRequest("POST", `/conversations/${conversationId}/messages`, payload);

  if (!isChatMessage(body)) {
    throw notUnderstood();
  }

  return body;
}

/** The replies in a message's thread, oldest first. */
export async function listReplies(messageId: number): Promise<ChatMessage[]> {
  return listOf(
    await apiRequest("GET", `/messages/${messageId}/replies`),
    "replies",
    isChatMessage,
  );
}

/** The newest message and the newest card the person has seen: either, or both. */
export interface Seen {
  messageId?: number;
  cardId?: number;
}

/** Say the person has seen everything up to these. */
export async function markRead(conversationId: number, seen: Seen): Promise<void> {
  const body: Record<string, number> = {};

  if (seen.messageId !== undefined) {
    body.message_id = seen.messageId;
  }
  if (seen.cardId !== undefined) {
    body.card_id = seen.cardId;
  }

  await apiRequest("POST", `/conversations/${conversationId}/read`, body);
}
