import { createContext, useContext, useEffect, useRef } from "react";

import type { LiveMessage } from "@/api/live";

export type LiveListener = (event: LiveMessage) => void;

export interface LiveValue {
  /** Hear every new message; call what it hands back to stop. */
  subscribe: (listener: LiveListener) => () => void;
}

/** Outside a `LiveProvider` nothing arrives, which a test page relies on. */
export const LiveContext = createContext<LiveValue>({ subscribe: () => () => {} });

/**
 * Call *listener* with each new message the person may read, from any
 * conversation, while the component is on screen. The newest *listener* is
 * always the one called, so it may use the component's current state.
 */
export function useLiveMessages(listener: LiveListener): void {
  const { subscribe } = useContext(LiveContext);
  const latest = useRef(listener);

  useEffect(() => {
    latest.current = listener;
  });

  useEffect(() => subscribe((event) => latest.current(event)), [subscribe]);
}
