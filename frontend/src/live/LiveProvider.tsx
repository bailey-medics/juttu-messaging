import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { eventsUrl, liveMessageFrom } from "@/api/live";

import { LiveContext, type LiveListener, type LiveValue } from "./LiveContext";

/** How long to wait before opening a new stream after one has failed. */
export const REOPEN_MS = 5000;

/**
 * The longest wait between tries. Each failure in a row doubles the wait up
 * to this, so a stream refused for good, such as after the session expired,
 * is not asked for every few seconds.
 */
export const MAX_REOPEN_MS = 60_000;

/**
 * Holds the one live stream for everything signed in, and passes each new
 * message to whoever is listening. Mounted by `RequireAuth`, so it opens on
 * signing in and closes on signing out.
 *
 * The browser reconnects a dropped stream by itself, sending the last
 * event's id, and the backend sends what was missed. When the browser gives
 * up, such as after an error answer, a new stream is opened a little later
 * from the last id this app had, waiting longer after each failure in a row.
 */
export default function LiveProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<LiveListener>());

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    let source: EventSource | null = null;
    let reopen: ReturnType<typeof setTimeout> | undefined;
    let lastId = "";
    let delay = REOPEN_MS;

    function open() {
      const opened = new EventSource(eventsUrl(lastId));
      source = opened;

      opened.addEventListener("ready", (event) => {
        lastId = event.lastEventId || lastId;
        delay = REOPEN_MS;
      });
      opened.addEventListener("message", (event) => {
        lastId = event.lastEventId || lastId;
        const found = liveMessageFrom(event.data);
        if (found === null) {
          return;
        }

        for (const listener of listeners.current) {
          listener(found);
        }
      });
      opened.addEventListener("error", () => {
        if (opened.readyState === EventSource.CLOSED) {
          reopen = setTimeout(open, delay);
          delay = Math.min(delay * 2, MAX_REOPEN_MS);
        }
      });
    }

    open();

    return () => {
      clearTimeout(reopen);
      source?.close();
    };
  }, []);

  const value = useMemo<LiveValue>(
    () => ({
      subscribe: (listener) => {
        listeners.current.add(listener);

        return () => {
          listeners.current.delete(listener);
        };
      },
    }),
    [],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
