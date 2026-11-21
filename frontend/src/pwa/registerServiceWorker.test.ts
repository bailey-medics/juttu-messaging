import {
  type RegisterScript,
  registerServiceWorker,
  type ServiceWorkerHost,
} from "@/pwa/registerServiceWorker";

function host(register: RegisterScript = vi.fn(async () => undefined)) {
  const listeners: Array<() => void> = [];
  const browser: ServiceWorkerHost = {
    navigator: { serviceWorker: { register } },
    addEventListener: (_type, listener) => listeners.push(listener),
  };

  return { browser, register, load: () => listeners.forEach((listener) => listener()) };
}

describe("registerServiceWorker", () => {
  it("registers /sw.js once the page has loaded, in production", () => {
    const { browser, register, load } = host();

    expect(registerServiceWorker(browser, true)).toBe(true);
    expect(register).not.toHaveBeenCalled();

    load();

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("registers nothing in development", () => {
    const { browser, register, load } = host();

    expect(registerServiceWorker(browser, false)).toBe(false);
    load();

    expect(register).not.toHaveBeenCalled();
  });

  it("registers nothing in a browser with no service workers", () => {
    const browser: ServiceWorkerHost = { navigator: {}, addEventListener: vi.fn() };

    expect(registerServiceWorker(browser, true)).toBe(false);
  });

  it("reports a failed registration instead of leaving it unhandled", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { browser, load } = host(vi.fn(async () => Promise.reject(new Error("refused"))));

    registerServiceWorker(browser, true);
    load();
    await vi.waitFor(() => expect(error).toHaveBeenCalled());

    error.mockRestore();
  });
});
