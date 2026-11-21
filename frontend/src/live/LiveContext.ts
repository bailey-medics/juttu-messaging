import { createContext, useContext, useEffect, useRef } from "react";

import type { LiveCard, LiveMessage } from "@/api/live";

export type LiveListener = (event: LiveMessage) => void;
export type LiveCardListener = (event: LiveCard) => void;

export interface LiveValue {
  /** Hear every new message; call what it hands back to stop. */
  subscribe: (listener: LiveListener) => () => void;
  /** Hear every card that changes; call what it hands back to stop. */
  subscribeCards: (listener: LiveCardListener) => () => void;
}

/** Outside a `LiveProvider` nothing arrives, which a test page relies on. */
export const LiveContext = createContext<LiveValue>({
  subscribe: () => () => {},
  subscribeCards: () => () => {},
});

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

/**
 * Call *listener* with each card that changes, as it now stands, in any
 * conversation the person may read, while the component is on screen.
 */
export function useLiveCards(listener: LiveCardListener): void {
  const { subscribeCards } = useContext(LiveContext);
  const latest = useRef(listener);

  useEffect(() => {
    latest.current = listener;
  });

  useEffect(() => subscribeCards((event) => latest.current(event)), [subscribeCards]);
}
