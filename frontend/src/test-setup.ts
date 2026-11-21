import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom has no layout observer, which Mantine's AppShell asks for.
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
});

// jsdom has no FontFaceSet. Mantine's autosizing text area listens on
// document.fonts to resize once web fonts load, as Quill's setup notes.
Object.defineProperty(document, "fonts", {
  writable: true,
  value: {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});

// jsdom does not scroll. FormStatus brings a new message into view with
// scrollIntoView; where it lands is checked in a real browser.
window.HTMLElement.prototype.scrollIntoView = () => undefined;

// jsdom has no media queries. Mantine asks for one to choose the colour
// scheme; the real answer is checked in a browser.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
