import { act, render, screen } from "@testing-library/react";

import { SIGNED_IN, SIGNED_OUT, stubFetchJson, stubFetchRoutes } from "@/test/render";

import { useAuth } from "./AuthContext";
import AuthProvider, { RETRY_UNREACHABLE_MS } from "./AuthProvider";

function ShowState() {
  const { state } = useAuth();

  return (
    <p>
      {state.status === "authenticated" ? `signed in as ${state.user.username}` : state.status}
    </p>
  );
}

function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button type="button" onClick={() => void signOut()}>
      Sign out
    </button>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <ShowState />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  it("asks who is signed in when the app opens", async () => {
    stubFetchJson(SIGNED_IN);

    renderProvider();

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("signed in as sam")).toBeInTheDocument();
  });

  it("knows when nobody is signed in", async () => {
    stubFetchJson(SIGNED_OUT);

    renderProvider();

    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();
  });

  it("says the backend is unreachable, not that nobody is signed in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("no network"))),
    );

    renderProvider();

    expect(await screen.findByText("unreachable")).toBeInTheDocument();
  });

  it("asks again while the backend is unreachable", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("no network"))),
    );
    renderProvider();
    await screen.findByText("unreachable");

    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_UNREACHABLE_MS);
    });

    expect(await screen.findByText("signed in as sam")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("refuses to be used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ShowState />)).toThrow("useAuth must be used inside AuthProvider");
  });

  it("forgets this device's notifications before signing out", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc";
    const unsubscribe = vi.fn(async () => true);
    vi.stubGlobal("Notification", { permission: "granted" });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription: async () => ({ endpoint, unsubscribe }) },
        }),
      },
    });
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_IN },
      "POST /api/push/subscriptions/remove": { body: null, status: 204 },
      "POST /api/auth/sign-out": { body: null, status: 204 },
    });
    render(
      <AuthProvider>
        <ShowState />
        <SignOutButton />
      </AuthProvider>,
    );
    await screen.findByText("signed in as sam");

    await act(async () => {
      screen.getByRole("button", { name: "Sign out" }).click();
    });

    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();
    const posted = vi
      .mocked(fetch)
      .mock.calls.map(([url]) => url)
      .filter((url) => url !== "/api/auth/me");
    expect(posted).toEqual(["/api/push/subscriptions/remove", "/api/auth/sign-out"]);
    expect(unsubscribe).toHaveBeenCalled();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });
});
