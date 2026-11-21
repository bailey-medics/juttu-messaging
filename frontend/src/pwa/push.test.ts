import { stubFetchRoutes } from "@/test/render";

import { disablePush, enablePush, keyBytes, pushState, type PushHost } from "./push";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";

function fakeSubscription() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: "BKey", auth: "secret" } }),
    unsubscribe: vi.fn(async () => true),
  };
}

function fakeHost(
  permission: NotificationPermission | undefined,
  subscribed: ReturnType<typeof fakeSubscription> | null = null,
  answer: NotificationPermission = "granted",
) {
  const subscription = fakeSubscription();
  const manager = {
    getSubscription: vi.fn(async () => subscribed),
    subscribe: vi.fn(async () => subscription),
  };
  const host: PushHost = {
    notificationPermission: () => permission,
    requestPermission: vi.fn(async () => answer),
    pushManager: async () => manager,
  };

  return { host, manager, subscription };
}

function serverWithKey(key: string | null) {
  stubFetchRoutes({
    "/api/push/key": { body: { public_key: key } },
    "POST /api/push/subscriptions": { body: { count: 1 }, status: 201 },
    "POST /api/push/subscriptions/remove": { body: null, status: 204 },
  });
}

describe("push notifications on this device", () => {
  beforeEach(() => {
    vi.stubGlobal("PushManager", class {});
  });

  it("turns a URL-safe key into its bytes", () => {
    expect([...keyBytes("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
  });

  it("says when the browser cannot show notifications", async () => {
    serverWithKey("BKey");

    await expect(pushState(fakeHost(undefined).host)).resolves.toBe("unsupported");

    vi.stubGlobal("PushManager", undefined);
    await expect(pushState(fakeHost("default").host)).resolves.toBe("unsupported");
  });

  it("says when they are blocked, off on the server, available or on", async () => {
    serverWithKey("BKey");
    await expect(pushState(fakeHost("denied").host)).resolves.toBe("denied");
    await expect(pushState(fakeHost("default").host)).resolves.toBe("available");
    await expect(pushState(fakeHost("granted", fakeSubscription()).host)).resolves.toBe("on");

    serverWithKey(null);
    await expect(pushState(fakeHost("default").host)).resolves.toBe("off");
  });

  it("asks, subscribes with the server's key, and tells the server", async () => {
    serverWithKey("AQID");
    const { host, manager } = fakeHost("default");

    await expect(enablePush(host)).resolves.toBe("on");

    expect(manager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("subscribes nothing when the person says no", async () => {
    serverWithKey("AQID");
    const refused = fakeHost("default", null, "denied");
    const dismissed = fakeHost("default", null, "default");

    await expect(enablePush(refused.host)).resolves.toBe("denied");
    await expect(enablePush(dismissed.host)).resolves.toBe("available");
    expect(refused.manager.subscribe).not.toHaveBeenCalled();
  });

  it("forgets this device on the server, then drops it", async () => {
    serverWithKey("AQID");
    const subscribed = fakeSubscription();

    await disablePush(fakeHost("granted", subscribed).host);

    expect(fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions/remove",
      expect.objectContaining({ body: JSON.stringify({ endpoint: ENDPOINT }) }),
    );
    expect(subscribed.unsubscribe).toHaveBeenCalled();
  });

  it("never stops a sign-out, even when the server cannot be told", async () => {
    stubFetchRoutes({});
    const subscribed = fakeSubscription();
    subscribed.unsubscribe.mockRejectedValue(new Error("gone"));

    await expect(disablePush(fakeHost("granted", subscribed).host)).resolves.toBeUndefined();
    await expect(disablePush(fakeHost(undefined).host)).resolves.toBeUndefined();
  });
});
