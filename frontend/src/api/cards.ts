/**
 * Living cards in a conversation: the backend's
 * `/api/conversations/{id}/cards`.
 */

import { apiRequest, isRecord } from "@/api/client";
import { listOf } from "@/api/spaces";

/** One thing that happened to a card, in its thread. */
export interface CardEventSummary {
  id: number;
  summary: string;
  received_at: string;
}

/** A card, as it stands now. */
export interface LivingCard {
  id: number;
  /** The module that understands it, such as a CI run. */
  kind: string;
  title: string;
  /** Where things stand, in the shape the card's kind decides. */
  state: Record<string, unknown>;
  /** Whether the card needs somebody now. */
  needs_attention: boolean;
  created_at: string;
  updated_at: string;
  /** Its latest events, oldest first. */
  events: CardEventSummary[];
}

function isCardEvent(value: unknown): value is CardEventSummary {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.summary === "string" &&
    typeof value.received_at === "string"
  );
}

export function isLivingCard(value: unknown): value is LivingCard {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.kind === "string" &&
    typeof value.title === "string" &&
    isRecord(value.state) &&
    typeof value.needs_attention === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    Array.isArray(value.events) &&
    value.events.every(isCardEvent)
  );
}

/** The cards in a conversation, oldest first. */
export async function listCards(conversationId: number): Promise<LivingCard[]> {
  const body = await apiRequest("GET", `/conversations/${conversationId}/cards`);

  return listOf(body, "cards", isLivingCard);
}
