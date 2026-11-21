import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HomePage from "@/pages/HomePage";
import { stubFetchJson, stubFetchRoutes } from "@/test/render";
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
});
