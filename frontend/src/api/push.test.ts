import { ApiError } from "@/api/client";
import { forgetSubscription, getPushKey, sayLooking, saveSubscription } from "@/api/push";
import { stubFetchJson, stubFetchRoutes } from "@/test/render";

describe("the push client", () => {
  it("reads the public key, or null while push is off", async () => {
    stubFetchJson({ public_key: "BKey" });
    await expect(getPushKey()).resolves.toBe("BKey");

    stubFetchJson({ public_key: null });
    await expect(getPushKey()).resolves.toBeNull();

    stubFetchJson({ public_key: 5 });
    await expect(getPushKey()).rejects.toBeInstanceOf(ApiError);
  });

  it("sends only the fields the backend stores", async () => {
    stubFetchJson({ count: 1 }, 201);

    await saveSubscription({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "BKey", auth: "secret" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
          expirationTime: null,
          keys: { p256dh: "BKey", auth: "secret" },
        }),
      }),
    );
  });

  it("forgets a subscription, and says what is on screen", async () => {
    stubFetchRoutes({
      "POST /api/push/subscriptions/remove": { body: null, status: 204 },
      "POST /api/push/looking": { body: null, status: 204 },
    });

    await forgetSubscription("https://fcm.googleapis.com/fcm/send/abc");
    await sayLooking(11, true);

    expect(fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions/remove",
      expect.objectContaining({
        body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/fcm/send/abc" }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/push/looking",
      expect.objectContaining({ body: JSON.stringify({ conversation: 11, looking: true }) }),
    );
  });
});
