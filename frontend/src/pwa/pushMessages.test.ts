import { notificationFor, openIn, urlOf, type AppWindow } from "./pushMessages";

const ICON = "/android-chrome-192x192.png";

describe("what the service worker does with a push", () => {
  it("shows the push's title and words, and keeps where it links to", () => {
    expect(
      notificationFor(
        {
          title: "general in Release",
          body: "Sam Patel sent a message",
          tag: "conversation-11",
          data: { url: "/conversations/11" },
        },
        ICON,
      ),
    ).toEqual({
      title: "general in Release",
      options: {
        body: "Sam Patel sent a message",
        tag: "conversation-11",
        icon: ICON,
        badge: ICON,
        data: { url: "/conversations/11" },
      },
    });
  });

  it("still shows something for a push it cannot read", () => {
    const shown = notificationFor("not an object", ICON);

    expect(shown.title).toBe("Juttu");
    expect(shown.options.data).toEqual({ url: "/" });
  });

  it("links only to a path inside the app", () => {
    expect(urlOf({ url: "/conversations/3" })).toBe("/conversations/3");
    expect(urlOf({ url: "https://elsewhere.example/" })).toBe("/");
    expect(urlOf({ url: "//elsewhere.example/" })).toBe("/");
    expect(urlOf({ url: "/\\elsewhere.example/" })).toBe("/");
    expect(urlOf(undefined)).toBe("/");
  });

  it("opens the conversation in a window of the app already open", async () => {
    const open: AppWindow = {
      url: "https://juttu.example/spaces",
      focus: vi.fn(async () => undefined),
      navigate: vi.fn(async () => undefined),
    };
    const openWindow = vi.fn(async () => undefined);

    await openIn("/conversations/3", [open], openWindow, "https://juttu.example");

    expect(open.focus).toHaveBeenCalled();
    expect(open.navigate).toHaveBeenCalledWith("https://juttu.example/conversations/3");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("only focuses a window already showing it", async () => {
    const open: AppWindow = {
      url: "https://juttu.example/conversations/3",
      focus: vi.fn(async () => undefined),
      navigate: vi.fn(async () => undefined),
    };

    await openIn("/conversations/3", [open], vi.fn(), "https://juttu.example");

    expect(open.navigate).not.toHaveBeenCalled();
  });

  it("opens a new window when none is open", async () => {
    const openWindow = vi.fn(async () => undefined);

    await openIn("/conversations/3", [], openWindow, "https://juttu.example");

    expect(openWindow).toHaveBeenCalledWith("https://juttu.example/conversations/3");
  });
});
