/**
 * Senders, for an organisation admin: the backend's `GET` and `POST
 * /api/inlet/senders`, `POST /api/inlet/senders/{id}/close` and `GET
 * /api/inlet/channels`. A sender is an outside tool, such as the box's
 * deploy script, that sends events which update cards in its channel.
 * Anybody else is refused with 403.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";
import { listOf } from "@/api/spaces";

/** A channel a sender's cards may land in, with the space it is in. */
export interface SenderChannel {
  id: number;
  name: string;
  space: { id: number; name: string };
}

export interface Sender {
  id: number;
  name: string;
  channel: SenderChannel;
  created_at: string;
  /** When it was closed, after which its secret stops working. */
  closed_at: string | null;
}

/** A sender just registered, with its secret, which is shown this once. */
export interface RegisteredSender extends Sender {
  secret: string;
}

export function isSenderChannel(value: unknown): value is SenderChannel {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    isRecord(value.space) &&
    typeof value.space.id === "number" &&
    typeof value.space.name === "string"
  );
}

export function isSender(value: unknown): value is Sender {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    isSenderChannel(value.channel) &&
    typeof value.created_at === "string" &&
    (value.closed_at === null || typeof value.closed_at === "string")
  );
}

function isRegisteredSender(value: unknown): value is RegisteredSender {
  return isSender(value) && isRecord(value) && typeof value.secret === "string";
}

function notUnderstood(): ApiError {
  return new ApiError(502, "The backend's answer about senders was not understood");
}

/** Every sender, open ones first. */
export async function listSenders(): Promise<Sender[]> {
  return listOf(await apiRequest("GET", "/inlet/senders"), "senders", isSender);
}

/** Every channel in the organisation, by space and then name. */
export async function listSenderChannels(): Promise<SenderChannel[]> {
  return listOf(await apiRequest("GET", "/inlet/channels"), "channels", isSenderChannel);
}

/**
 * Register a sender whose cards land in a channel.
 *
 * @throws ApiError with status 400 and the backend's reason, such as a
 *   conversation that is not a channel.
 */
export async function registerSender(
  name: string,
  channelId: number,
): Promise<RegisteredSender> {
  const body = await apiRequest("POST", "/inlet/senders", { name, channel: channelId });

  if (!isRegisteredSender(body)) {
    throw notUnderstood();
  }

  return body;
}

/** Close a sender. Its secret stops working at once. */
export async function closeSender(id: number): Promise<Sender> {
  const body = await apiRequest("POST", `/inlet/senders/${id}/close`);

  if (!isSender(body)) {
    throw notUnderstood();
  }

  return body;
}
