import { API_SUCCESS_EVENT, apiRequest, NETWORK_ERROR_EVENT } from "@/api/client";

/** Every connectivity event sent on `window` while *run* runs. */
async function eventsDuring(run: () => Promise<unknown>): Promise<string[]> {
  const heard: string[] = [];
  const listen = (event: Event) => heard.push(event.type);
  window.addEventListener(NETWORK_ERROR_EVENT, listen);
  window.addEventListener(API_SUCCESS_EVENT, listen);

  try {
    await run().catch(() => {});
  } finally {
    window.removeEventListener(NETWORK_ERROR_EVENT, listen);
    window.removeEventListener(API_SUCCESS_EVENT, listen);
  }

  return heard;
}

function answer(response: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(response));
}

describe("apiRequest's connectivity events", () => {
  it("says the backend answered", async () => {
    answer(async () => Response.json({ status: "ok" }));

    const heard = await eventsDuring(() => apiRequest("GET", "/health"));

    expect(heard).toEqual([API_SUCCESS_EVENT]);
  });

  it("counts a refusal from the backend as an answer", async () => {
    answer(async () => Response.json({ detail: "Not allowed." }, { status: 403 }));

    const heard = await eventsDuring(() => apiRequest("GET", "/members"));

    expect(heard).toEqual([API_SUCCESS_EVENT]);
  });

  it("says the backend cannot be reached when nothing answers", async () => {
    answer(async () => {
      throw new TypeError("Failed to fetch");
    });

    const heard = await eventsDuring(() => apiRequest("GET", "/health"));

    expect(heard).toEqual([NETWORK_ERROR_EVENT]);
  });

  it("says the backend cannot be reached when a proxy answers it is down", async () => {
    answer(async () => new Response("<h1>502 Bad Gateway</h1>", { status: 502 }));

    const heard = await eventsDuring(() => apiRequest("GET", "/health"));

    expect(heard).toEqual([NETWORK_ERROR_EVENT]);
  });

  it("counts a 503 the backend answered itself as an answer", async () => {
    answer(async () => Response.json({ detail: "Unavailable." }, { status: 503 }));

    const heard = await eventsDuring(() => apiRequest("POST", "/push/settings", {}));

    expect(heard).toEqual([API_SUCCESS_EVENT]);
  });
});
