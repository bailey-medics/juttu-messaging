import { eventsUrl, isLiveMessage, liveMessageFrom } from "@/api/live";

const message = {
  id: 9,
  author: { id: 2, name: "Alex" },
  body: "Hi",
  created_at: "2026-11-21T10:00:00Z",
  amends: null,
  thread: null,
  reply_count: 0,
};

describe("the live delivery client", () => {
  it("opens from now, or from the last id it had", () => {
    expect(eventsUrl("")).toBe("/api/events");
    expect(eventsUrl("42")).toBe("/api/events?after=42");
  });

  it("reads a new message and refuses anything else", () => {
    const live = { conversation: 3, space: 1, message };

    expect(isLiveMessage(live)).toBe(true);
    expect(liveMessageFrom(JSON.stringify(live))).toEqual(live);
    expect(liveMessageFrom(JSON.stringify({ ...live, space: "1" }))).toBeNull();
    expect(liveMessageFrom(JSON.stringify({ ...live, message: { id: 9 } }))).toBeNull();
    expect(liveMessageFrom("not json")).toBeNull();
    expect(liveMessageFrom(undefined)).toBeNull();
  });
});
