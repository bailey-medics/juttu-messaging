import { act, render } from "@testing-library/react";

import type { LiveMessage } from "@/api/live";
import { latestStream, stubEventSource } from "@/test/eventSource";

import { useLiveMessages } from "./LiveContext";
import LiveProvider, { MAX_REOPEN_MS, REOPEN_MS } from "./LiveProvider";

const arrival: LiveMessage = {
  conversation: 3,
  space: 1,
  message: {
    id: 9,
    author: { id: 2, name: "Alex" },
    body: "Hi",
    created_at: "2026-11-21T10:00:00Z",
    amends: null,
    thread: null,
    reply_count: 0,
  },
};

function Listener({ heard }: { heard: (event: LiveMessage) => void }) {
  useLiveMessages(heard);

  return null;
}

function renderListening(heard: (event: LiveMessage) => void) {
  return render(
    <LiveProvider>
      <Listener heard={heard} />
    </LiveProvider>,
  );
}

describe("the live stream", () => {
  it("passes each new message to whoever is listening", () => {
    stubEventSource();
    const heard = vi.fn();
    renderListening(heard);

    latestStream().emit("message", arrival, "9");

    expect(latestStream().url).toBe("/api/events");
    expect(heard).toHaveBeenCalledExactlyOnceWith(arrival);
  });

  it("ignores an event it does not understand", () => {
    stubEventSource();
    const heard = vi.fn();
    renderListening(heard);

    latestStream().emit("message", { conversation: 3 }, "9");
    latestStream().emit("message", "not json", "10");

    expect(heard).not.toHaveBeenCalled();
  });

  it("opens a new stream from the last id it had once the browser gives up", () => {
    vi.useFakeTimers();
    const sources = stubEventSource();
    renderListening(vi.fn());

    latestStream().emit("ready", {}, "4");
    latestStream().emit("message", arrival, "9");
    latestStream().fail();
    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });

    expect(sources.opened).toHaveLength(2);
    expect(latestStream().url).toBe("/api/events?after=9");
    vi.useRealTimers();
  });

  it("waits longer after each failure in a row, and starts again once a stream opens", () => {
    vi.useFakeTimers();
    const sources = stubEventSource();
    renderListening(vi.fn());

    latestStream().fail();
    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });
    latestStream().fail();
    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });

    expect(sources.opened).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });
    expect(sources.opened).toHaveLength(3);

    for (let failures = 0; failures < 6; failures += 1) {
      latestStream().fail();
      act(() => {
        vi.advanceTimersByTime(MAX_REOPEN_MS);
      });
    }
    const before = sources.opened.length;
    latestStream().emit("ready", {}, "4");
    latestStream().fail();
    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });

    expect(sources.opened).toHaveLength(before + 1);
    vi.useRealTimers();
  });

  it("leaves reconnecting to the browser while it is still trying", () => {
    vi.useFakeTimers();
    const sources = stubEventSource();
    renderListening(vi.fn());

    latestStream().readyState = sources.CONNECTING;
    latestStream().emit("error", "");
    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });

    expect(sources.opened).toHaveLength(1);
    vi.useRealTimers();
  });

  it("closes the stream, and stops reopening it, when signed out", () => {
    vi.useFakeTimers();
    const sources = stubEventSource();
    const { unmount } = renderListening(vi.fn());
    const stream = latestStream();

    stream.fail();
    unmount();
    act(() => {
      vi.advanceTimersByTime(REOPEN_MS);
    });

    expect(stream.readyState).toBe(sources.CLOSED);
    expect(sources.opened).toHaveLength(1);
    vi.useRealTimers();
  });

  it("stops passing messages to a listener that has gone", () => {
    stubEventSource();
    const heard = vi.fn();
    const { rerender } = renderListening(heard);

    rerender(<LiveProvider>{null}</LiveProvider>);
    latestStream().emit("message", arrival, "9");

    expect(heard).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without live streams", () => {
    const heard = vi.fn();

    expect(() => renderListening(heard)).not.toThrow();
  });
});
