import { ApiError } from "@/api/client";
import {
  isConversationSummary,
  isChatMessage,
  listConversations,
  sendMessage,
} from "@/api/conversations";
import { createSpace, isSpace, listSpaces } from "@/api/spaces";
import { stubFetchJson } from "@/test/render";

describe("the spaces and conversations clients", () => {
  it("lists spaces and refuses an answer it does not understand", async () => {
    stubFetchJson({ spaces: [{ id: 1, name: "Release", is_clinical: false, kind: "dev" }] });
    await expect(listSpaces()).resolves.toHaveLength(1);

    stubFetchJson({ spaces: [{ id: 1 }] });
    await expect(listSpaces()).rejects.toBeInstanceOf(ApiError);
  });

  it("makes a space with its name and kind", async () => {
    stubFetchJson({ id: 1, name: "Release", is_clinical: false, kind: "personal" }, 201);

    await createSpace("Release", "personal");

    expect(fetch).toHaveBeenCalledWith(
      "/api/spaces",
      expect.objectContaining({ body: JSON.stringify({ name: "Release", kind: "personal" }) }),
    );
  });

  it("checks conversations and messages", async () => {
    expect(isSpace({ id: 1, name: "R", is_clinical: "no" })).toBe(false);
    expect(isSpace({ id: 1, name: "R", is_clinical: false, kind: "social" })).toBe(false);
    expect(isConversationSummary({ id: 1, kind: "group", title: "x" })).toBe(false);
    expect(
      isChatMessage({
        id: 1,
        author: { id: 2, name: "Alex" },
        body: "Hi",
        created_at: "2026-11-21T10:00:00Z",
        amends: null,
        thread: null,
        reply_count: 0,
      }),
    ).toBe(true);

    stubFetchJson({
      conversations: [{ id: 3, kind: "direct", title: "Sam Patel", unread_count: 0 }],
    });
    await expect(listConversations(1)).resolves.toEqual([
      { id: 3, kind: "direct", title: "Sam Patel", unread_count: 0 },
    ]);
  });

  it("sends a message's text", async () => {
    stubFetchJson(
      {
        id: 9,
        author: { id: 2, name: "Alex" },
        body: "Hi",
        created_at: "2026-11-21T10:00:00Z",
        amends: null,
        thread: null,
        reply_count: 0,
      },
      201,
    );

    await sendMessage(3, "Hi");

    expect(fetch).toHaveBeenCalledWith(
      "/api/conversations/3/messages",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ body: "Hi" }) }),
    );
  });
});
