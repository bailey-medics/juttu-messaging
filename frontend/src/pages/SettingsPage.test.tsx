import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createInstallPromptCapture, type InstallPromptCapture } from "@/pwa/installPrompt";
import type { InstallEnvironment } from "@/pwa/installRoute";
import SettingsPage from "@/pages/SettingsPage";
import { renderAt, SIGNED_IN, stubFetchJson, stubFetchRoutes } from "@/test/render";
import { renderWithRouter } from "@/test/test-utils";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/** A browser of this user agent, offering a prompt when the store holds one. */
function browser(userAgent: string, isStandalone = false) {
  return (hasDeferredPrompt: boolean): InstallEnvironment => ({
    userAgent,
    maxTouchPoints: 5,
    hasDeferredPrompt,
    isStandalone,
  });
}

/** A store holding a prompt the browser offered, and that prompt. */
function offeredPrompt(): { capture: InstallPromptCapture; prompt: ReturnType<typeof vi.fn> } {
  const target = new EventTarget();
  const capture = createInstallPromptCapture();
  const prompt = vi.fn(() => Promise.resolve());
  capture.wire(target);
  target.dispatchEvent(
    Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    }),
  );

  return { capture, prompt };
}

function renderSettings(
  capture: InstallPromptCapture = createInstallPromptCapture(),
  readEnvironment = browser(CHROME),
) {
  renderWithRouter(<SettingsPage capture={capture} readEnvironment={readEnvironment} />);
}

describe("SettingsPage", () => {
  it("is titled Settings, and reached from the navigation", async () => {
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });

    renderAt("/settings");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    // The side navigation draws its links once beside the page, and again
    // in the drawer a phone opens.
    for (const link of screen.getAllByRole("link", { name: "Settings" })) {
      expect(link).toHaveAttribute("href", "/settings");
    }
  });

  it("says when this browser cannot show notifications", async () => {
    stubFetchJson({ status: "ok" });

    renderSettings();

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

    renderSettings();
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

    renderSettings();
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

    renderSettings();
    await userEvent.click(await screen.findByRole("radio", { name: /Every message/ }));

    expect(
      await screen.findByText("Your choice was not saved. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Direct messages and mentions/ })).toBeChecked();
  });

  describe("the order of spaces", () => {
    const release = { id: 1, name: "Release", is_clinical: false, kind: "dev" };
    const ward = { id: 3, name: "Ward", is_clinical: true, kind: "clinical" };

    it("moves a space and saves the new order at once", async () => {
      stubFetchRoutes({
        "/api/me/space-order": { body: { spaces: [release, ward] } },
        "PUT /api/me/space-order": { body: { spaces: [ward, release] } },
      });
      renderSettings();

      await userEvent.click(await screen.findByRole("button", { name: "Move Ward up" }));

      expect(fetch).toHaveBeenCalledWith(
        "/api/me/space-order",
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ space_ids: [3, 1] }) }),
      );
      expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "Ward",
        "Release",
      ]);
    });

    it("puts the order back when a move does not save", async () => {
      stubFetchRoutes({
        "/api/me/space-order": { body: { spaces: [release, ward] } },
        "PUT /api/me/space-order": { body: { detail: "Unavailable." }, status: 503 },
      });
      renderSettings();

      await userEvent.click(await screen.findByRole("button", { name: "Move Ward up" }));

      expect(await screen.findByText("That move did not save. Try again.")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "Release",
        "Ward",
      ]);
    });
  });

  describe("installing Juttu", () => {
    it("opens the browser's own install when it has offered one", async () => {
      stubFetchJson({ status: "ok" });
      const { capture, prompt } = offeredPrompt();

      renderSettings(capture);
      await userEvent.click(screen.getByRole("button", { name: "Install Juttu" }));

      expect(prompt).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows the share menu steps on an iPhone, which offers no prompt", async () => {
      stubFetchJson({ status: "ok" });

      renderSettings(createInstallPromptCapture(), browser(IPHONE_SAFARI));
      await userEvent.click(screen.getByRole("button", { name: "Install Juttu" }));

      expect(
        await screen.findByText("Scroll down and tap Add to Home Screen."),
      ).toBeInTheDocument();
    });

    it("offers no install once Juttu runs as the installed app", () => {
      stubFetchJson({ status: "ok" });

      renderSettings(createInstallPromptCapture(), browser(CHROME, true));

      expect(screen.queryByRole("button", { name: "Install Juttu" })).not.toBeInTheDocument();
    });
  });
});
