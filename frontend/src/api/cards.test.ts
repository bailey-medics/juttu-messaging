import { ApiError } from "@/api/client";
import { isLivingCard, listCards } from "@/api/cards";
import { liveCardFrom } from "@/api/live";
import { stubFetchJson } from "@/test/render";

const card = {
  id: 1,
  kind: "ci-run",
  title: "Build 41",
  state: { status: "running" },
  needs_attention: false,
  created_at: "2026-11-21T10:00:00+00:00",
  updated_at: "2026-11-21T10:00:00+00:00",
  events: [{ id: 1, summary: "Running", received_at: "2026-11-21T10:00:00+00:00" }],
};

describe("the cards client", () => {
  it("lists a conversation's cards and refuses an answer it does not understand", async () => {
    stubFetchJson({ cards: [card] });
    await expect(listCards(11)).resolves.toEqual([card]);
    expect(fetch).toHaveBeenCalledWith("/api/conversations/11/cards", expect.anything());

    stubFetchJson({ cards: [{ ...card, events: [{ id: 1 }] }] });
    await expect(listCards(11)).rejects.toBeInstanceOf(ApiError);
  });

  it("checks a card's shape", () => {
    expect(isLivingCard(card)).toBe(true);
    expect(isLivingCard({ ...card, state: "running" })).toBe(false);
    expect(isLivingCard({ ...card, needs_attention: "no" })).toBe(false);
  });

  it("reads a changed card from the live stream", () => {
    const live = { conversation: 11, space: 7, card };

    expect(liveCardFrom(JSON.stringify(live))).toEqual(live);
    expect(liveCardFrom(JSON.stringify({ ...live, card: { id: 1 } }))).toBeNull();
    expect(liveCardFrom("not json")).toBeNull();
  });
});
