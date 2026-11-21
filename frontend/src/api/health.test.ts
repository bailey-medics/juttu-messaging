import { checkHealth, isHealthResponse } from "@/api/health";
import { stubFetchJson } from "@/test/render";

describe("isHealthResponse", () => {
  it("accepts the backend's answer", () => {
    expect(isHealthResponse({ status: "ok" })).toBe(true);
  });

  it.each([null, "ok", {}, { status: "degraded" }, { status: true }])("refuses %j", (body) => {
    expect(isHealthResponse(body)).toBe(false);
  });
});

describe("checkHealth", () => {
  it("is true when the backend says it is ok", async () => {
    stubFetchJson({ status: "ok" });

    await expect(checkHealth()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/health", { signal: undefined });
  });

  it("is false for an error status", async () => {
    stubFetchJson({ status: "ok" }, 503);

    await expect(checkHealth()).resolves.toBe(false);
  });

  it("is false for a body that is not the health check's", async () => {
    stubFetchJson({ status: "starting" });

    await expect(checkHealth()).resolves.toBe(false);
  });

  it("is false when nothing answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("no network"))),
    );

    await expect(checkHealth()).resolves.toBe(false);
  });

  it("passes an abort on, so a page that has gone sets no state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new DOMException("aborted", "AbortError"))),
    );

    await expect(checkHealth()).rejects.toThrow("aborted");
  });
});
