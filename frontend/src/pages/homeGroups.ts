import type { HomeConversation } from "@/api/conversations";
import { SPACE_KINDS } from "@/api/spaces";

/** One space's conversations, as Home shows them under its name. */
export interface SpaceGroup {
  space: HomeConversation["space"];
  conversations: HomeConversation[];
}

/** Where a kind comes in Home's order: Dev, then Personal, then Clinical. */
function kindPlace(kind: HomeConversation["space"]["kind"]): number {
  return SPACE_KINDS.findIndex((k) => k.value === kind);
}

/**
 * *conversations*, grouped by space. Spaces come in kind order, Dev, then
 * Personal, then Clinical, and A to Z within a kind. Within a space the
 * conversations keep the order they came in, most recently active first.
 */
export function groupBySpace(conversations: HomeConversation[]): SpaceGroup[] {
  const groups = new Map<number, SpaceGroup>();

  for (const conversation of conversations) {
    const group = groups.get(conversation.space.id);

    if (group === undefined) {
      groups.set(conversation.space.id, {
        space: conversation.space,
        conversations: [conversation],
      });
    } else {
      group.conversations.push(conversation);
    }
  }

  return [...groups.values()].sort(
    (a, b) =>
      kindPlace(a.space.kind) - kindPlace(b.space.kind) ||
      a.space.name.localeCompare(b.space.name, "en-GB") ||
      a.space.id - b.space.id,
  );
}
