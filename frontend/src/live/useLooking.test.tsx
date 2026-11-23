import { act, renderHook } from "@testing-library/react";

import { stubFetchRoutes } from "@/test/render";

import { LOOKING_EVERY_MS, useLooking } from "./useLooking";

function bodies(): unknown[] {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => url === "/api/push/looking")
    .map(([, init]) => JSON.parse(String(init?.body)));
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("saying a conversation is on screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubFetchRoutes({ "POST /api/push/looking": { body: null, status: 204 } });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says so at once, and every half minute while visible", () => {
    renderHook(() => useLooking(11));
    act(() => {
      vi.advanceTimersByTime(LOOKING_EVERY_MS * 2);
    });

    expect(bodies()).toEqual([
      { conversation: 11, looking: true },
      { conversation: 11, looking: true },
      { conversation: 11, looking: true },
    ]);
  });

  it("says it has stopped when hidden, and says so again when back", () => {
    renderHook(() => useLooking(11));

    setVisibility("hidden");
    act(() => {
      vi.advanceTimersByTime(LOOKING_EVERY_MS);
    });
    setVisibility("visible");

    expect(bodies()).toEqual([
      { conversation: 11, looking: true },
      { conversation: 11, looking: false },
      { conversation: 11, looking: true },
    ]);
  });

  it("says it has stopped when the page is left", () => {
    const { unmount } = renderHook(() => useLooking(11));

    unmount();
    act(() => {
      vi.advanceTimersByTime(LOOKING_EVERY_MS);
    });

    expect(bodies()).toEqual([
      { conversation: 11, looking: true },
      { conversation: 11, looking: false },
    ]);
  });

  it("says nothing for an address that is not a conversation", () => {
    renderHook(() => useLooking(Number.NaN));

    expect(bodies()).toEqual([]);
  });
});
