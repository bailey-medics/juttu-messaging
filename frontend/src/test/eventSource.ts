import { act } from "@testing-library/react";
import { vi } from "vitest";

type Listener = (event: MessageEvent) => void;

/**
 * A stand-in for the browser's `EventSource`, which jsdom lacks. Each one
 * opened is kept, so a test can send it events or make it fail.
 */
export class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  /** Every stream opened since `stubEventSource`, oldest first. */
  static opened: FakeEventSource[] = [];

  readonly url: string;
  readyState = FakeEventSource.OPEN;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.opened.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const found = this.listeners.get(type) ?? new Set<Listener>();
    found.add(listener);
    this.listeners.set(type, found);
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED;
  }

  /** Send one event, as the backend writes it. */
  emit(type: string, data: unknown, lastEventId = ""): void {
    const event = new MessageEvent(type, {
      data: typeof data === "string" ? data : JSON.stringify(data),
      lastEventId,
    });

    act(() => {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event);
      }
    });
  }

  /** Fail as the browser does when it gives up on a stream. */
  fail(): void {
    this.readyState = FakeEventSource.CLOSED;
    this.emit("error", "");
  }
}

/** Put the stand-in in place of `EventSource` for this test. */
export function stubEventSource(): typeof FakeEventSource {
  FakeEventSource.opened = [];
  vi.stubGlobal("EventSource", FakeEventSource);

  return FakeEventSource;
}

/** The stream opened most recently. */
export function latestStream(): FakeEventSource {
  const found = FakeEventSource.opened.at(-1);
  if (found === undefined) {
    throw new Error("No live stream has been opened.");
  }

  return found;
}
