import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { API_UNREACHABLE } from "@/pages/apiFailure";
import HomePage from "@/pages/HomePage";
import { latestStream, stubEventSource } from "@/test/eventSource";
import { renderAt, SIGNED_IN, stubFetchJson, stubFetchRoutes } from "@/test/render";
import { renderWithRouter } from "@/test/test-utils";

describe("HomePage", () => {
  it("says the backend is up when the health check answers", async () => {
    stubFetchJson({ status: "ok" });

    renderWithRouter(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(await screen.findByText("Backend up")).toBeInTheDocument();
  });

  it("says the backend is down when the health check fails", async () => {
    stubFetchJson({ detail: "unavailable" }, 502);

    renderWithRouter(<HomePage />);

    expect(await screen.findByText("Backend down")).toBeInTheDocument();
  });

  it("shows that it is checking before the answer comes", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    renderWithRouter(<HomePage />);

    expect(screen.getByText("Checking")).toBeInTheDocument();
  });

  it("says when this browser cannot show notifications", async () => {
    stubFetchJson({ status: "ok" });

    renderWithRouter(<HomePage />);

    expect(
      await screen.findByText("This browser cannot show notifications.", { exact: false }),
    ).toBeInTheDocument();
  });

  it("turns notifications on for this device", async () => {
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      toJSON: () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: "BKey", auth: "secret" },
      }),
    };
    const pushManager = {
      getSubscription: vi.fn(async () => null),
      subscribe: vi.fn(async () => subscription),
    };
    vi.stubGlobal("PushManager", class {});
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn(async () => "granted"),
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: Promise.resolve({ pushManager }) },
    });
    stubFetchRoutes({
      "/api/health": { body: { status: "ok" } },
      "/api/push/key": { body: { public_key: "AQID" } },
      "POST /api/push/subscriptions": { body: { count: 1 }, status: 201 },
    });

    renderWithRouter(<HomePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));

    expect(
      await screen.findByText("This device gets a notification when a message arrives."),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions",
      expect.objectContaining({ method: "POST" }),
    );
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("changes what notifies the person, on every device", async () => {
    stubFetchRoutes({
      "/api/health": { body: { status: "ok" } },
      "/api/push/settings": { body: { level: "quiet" } },
      "POST /api/push/settings": { body: { level: "nothing" } },
    });

    renderWithRouter(<HomePage />);
    await userEvent.click(await screen.findByRole("radio", { name: /Nothing/ }));

    expect(await screen.findByRole("radio", { name: /Nothing/ })).toBeChecked();
    expect(fetch).toHaveBeenCalledWith(
      "/api/push/settings",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ level: "nothing" }) }),
    );
  });

  it("puts the choice back when it does not save", async () => {
    stubFetchRoutes({
      "/api/health": { body: { status: "ok" } },
      "/api/push/settings": { body: { level: "quiet" } },
      "POST /api/push/settings": { body: { detail: "Unavailable." }, status: 503 },
    });

    renderWithRouter(<HomePage />);
    await userEvent.click(await screen.findByRole("radio", { name: /Every message/ }));

    expect(
      await screen.findByText("Your choice was not saved. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Direct messages and mentions/ })).toBeChecked();
  });

  describe("your conversations", () => {
    const general = {
      id: 11,
      kind: "channel",
      title: "general",
      unread_count: 3,
      space: { id: 7, name: "Release" },
      last_active_at: "2026-11-21T20:30:00Z",
    };
    const withAlex = {
      id: 12,
      kind: "direct",
      title: "Alex Morgan",
      unread_count: 0,
      space: { id: 9, name: "Design" },
      last_active_at: "2026-11-21T18:05:00Z",
    };

    function routes(conversations: unknown[]) {
      return {
        "/api/auth/me": { body: SIGNED_IN },
        "/api/health": { body: { status: "ok" } },
        "/api/conversations": { body: { conversations } },
      };
    }

    it("lists every conversation with its space and unread count, in order", async () => {
      stubFetchRoutes(routes([general, withAlex]));

      renderWithRouter(<HomePage />);
      await screen.findAllByText("Alex Morgan");

      const rows = screen.getAllByRole("row");
      expect(rows.map((row) => row.textContent)).toEqual([
        expect.stringContaining("Name"),
        expect.stringMatching(/general.*Release.*Channel/),
        expect.stringMatching(/Alex Morgan.*Design.*Direct/),
      ]);
      expect(screen.getAllByLabelText("3 unread")[0]).toBeInTheDocument();
    });

    it("says how to get a conversation when there are none", async () => {
      stubFetchRoutes(routes([]));

      renderWithRouter(<HomePage />);

      expect(
        await screen.findByText(
          "No conversations yet. Once an admin adds you to a space, its channels show here.",
        ),
      ).toBeInTheDocument();
    });

    it("says so when the list cannot be loaded", async () => {
      stubFetchRoutes({
        "/api/health": { body: { status: "ok" } },
        "/api/conversations": { body: { detail: "Unavailable." }, status: 503 },
      });

      renderWithRouter(<HomePage />);

      expect((await screen.findAllByText(API_UNREACHABLE))[0]).toBeInTheDocument();
    });

    it("opens a conversation when its row is chosen", async () => {
      stubFetchRoutes({
        ...routes([general]),
        "/api/conversations/11/messages": { body: { messages: [] } },
        "/api/conversations/11/cards": { body: { cards: [] } },
      });

      renderAt("/");
      await userEvent.click(await screen.findByText("general"));

      expect(
        await screen.findByRole("heading", { level: 1, name: "general" }),
      ).toBeInTheDocument();
    });

    it("loads the list again when a new message arrives", async () => {
      stubEventSource();
      stubFetchRoutes(routes([general]));

      renderAt("/");
      await screen.findByText("general");
      const before = vi
        .mocked(fetch)
        .mock.calls.filter(([url]) => url === "/api/conversations");

      latestStream().emit(
        "message",
        {
          conversation: 11,
          space: 7,
          message: {
            id: 40,
            author: { id: 2, name: "Alex Morgan" },
            body: "Deploying now.",
            created_at: "2026-11-21T20:31:00Z",
            amends: null,
            thread: null,
            reply_count: 0,
          },
        },
        "40.0",
      );

      await waitFor(() =>
        expect(
          vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/conversations").length,
        ).toBe(before.length + 1),
      );
    });
  });
});
