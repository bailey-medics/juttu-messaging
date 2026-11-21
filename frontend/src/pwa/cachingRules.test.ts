import { cachingRuleFor, isApiRequest, type RequestFacts } from "@/pwa/cachingRules";

const ORIGIN = "https://juttu.example";

function request(path: string, mode = "cors", origin = ORIGIN): RequestFacts {
  return { url: new URL(path, origin), mode, origin: ORIGIN };
}

describe("isApiRequest", () => {
  it.each(["/api", "/api/health", "/api/messages?since=1"])("is true for %s", (path) => {
    expect(isApiRequest(request(path))).toBe(true);
  });

  it.each(["/", "/apiary", "/assets/api.js"])("is false for %s", (path) => {
    expect(isApiRequest(request(path))).toBe(false);
  });

  it("is false for another site's /api", () => {
    expect(isApiRequest(request("/api/health", "cors", "https://elsewhere.example"))).toBe(
      false,
    );
  });
});

describe("cachingRuleFor", () => {
  it("never caches an API request, even a page load of one", () => {
    expect(cachingRuleFor(request("/api/health"))).toBe("network-only");
    expect(cachingRuleFor(request("/api/health", "navigate"))).toBe("network-only");
  });

  it("tries the network first for a page load, with the offline page behind it", () => {
    expect(cachingRuleFor(request("/", "navigate"))).toBe("network-first-offline-page");
    expect(cachingRuleFor(request("/some/page", "navigate"))).toBe(
      "network-first-offline-page",
    );
  });

  it("serves the app's own files from the precache", () => {
    expect(cachingRuleFor(request("/assets/index-abc123.js"))).toBe("precache");
    expect(cachingRuleFor(request("/android-chrome-192x192.png", "no-cors"))).toBe("precache");
  });

  it("leaves another site's files to the network", () => {
    expect(cachingRuleFor(request("/font.woff2", "cors", "https://fonts.example"))).toBe(
      "network-only",
    );
  });
});
