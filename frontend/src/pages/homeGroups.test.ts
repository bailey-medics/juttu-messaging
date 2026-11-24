import type { HomeConversation } from "@/api/conversations";
import type { SpaceKind } from "@/api/spaces";

import { groupBySpace } from "./homeGroups";

function conversation(
  id: number,
  spaceId: number,
  name: string,
  kind: SpaceKind,
): HomeConversation {
  return {
    id,
    kind: "channel",
    title: `channel ${id}`,
    unread_count: 0,
    icon: "rocket",
    icon_colour: 0,
    shows_people: true,
    icon_url: null,
    space: { id: spaceId, name, kind },
    last_active_at: "2026-11-23T08:00:00Z",
    last_item: null,
    people: [],
  };
}

describe("groupBySpace", () => {
  it("puts Dev first, then Personal, then Clinical", () => {
    const groups = groupBySpace([
      conversation(1, 30, "Ward", "clinical"),
      conversation(2, 20, "Home life", "personal"),
      conversation(3, 10, "Release", "dev"),
    ]);

    expect(groups.map((g) => g.space.name)).toEqual(["Release", "Home life", "Ward"]);
  });

  it("orders spaces of one kind A to Z", () => {
    const groups = groupBySpace([
      conversation(1, 2, "Release", "dev"),
      conversation(2, 1, "Design", "dev"),
    ]);

    expect(groups.map((g) => g.space.name)).toEqual(["Design", "Release"]);
  });

  it("keeps each space's conversations in the order they came, newest first", () => {
    const groups = groupBySpace([
      conversation(5, 1, "Release", "dev"),
      conversation(9, 2, "Design", "dev"),
      conversation(3, 1, "Release", "dev"),
    ]);

    expect(groups.find((g) => g.space.id === 1)?.conversations.map((c) => c.id)).toEqual([
      5, 3,
    ]);
  });

  it("follows the person's own order, with any other space after", () => {
    const groups = groupBySpace(
      [
        conversation(1, 10, "Release", "dev"),
        conversation(2, 20, "Ward", "clinical"),
        conversation(3, 30, "Allotment", "personal"),
        conversation(4, 40, "Design", "dev"),
      ],
      [20, 30],
    );

    expect(groups.map((g) => g.space.name)).toEqual(["Ward", "Allotment", "Design", "Release"]);
  });
});
