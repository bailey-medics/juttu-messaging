import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { API_SUCCESS_EVENT, NETWORK_ERROR_EVENT } from "@/api/client";
import MainLayout from "@/components/layouts/MainLayout";
import { ConnectivityProvider } from "@/connectivity";
import { renderWithRouter } from "@/test/test-utils";

/** Make every media query match, as on a narrow screen, or none. */
function screenIsNarrow(narrow: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: narrow,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("MainLayout", () => {
  it("frames the page with the ribbon, the side navigation and the page", () => {
    screenIsNarrow(false);

    renderWithRouter(
      <MainLayout>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("Juttu");
    const rail = screen.getByRole("complementary");
    expect(within(rail).getByRole("navigation", { name: "Primary" })).toHaveTextContent("Home");
    expect(within(screen.getByRole("main")).getByText("The page")).toBeInTheDocument();
  });

  it("offers a link that skips past the navigation to the page", () => {
    screenIsNarrow(false);

    renderWithRouter(
      <MainLayout>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("link", { name: /skip to main content/i })).toBeInTheDocument();
  });

  it("shows the ribbon's right section", () => {
    screenIsNarrow(false);

    renderWithRouter(
      <MainLayout rightSection={<button type="button">Install Juttu</button>}>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("button", { name: "Install Juttu" })).toBeInTheDocument();
  });

  it("says Loading and shows no page while the page loads", () => {
    screenIsNarrow(false);

    renderWithRouter(
      <MainLayout isLoading>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("The page")).not.toBeInTheDocument();
  });

  it("puts the burger in place of the name on a narrow screen, and opens the drawer", async () => {
    screenIsNarrow(true);

    renderWithRouter(
      <MainLayout>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.queryByRole("link", { name: "Juttu" })).not.toBeInTheDocument();
    const burger = within(screen.getByRole("banner")).getByRole("button");
    await userEvent.click(burger);

    expect(await screen.findByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  describe("the connection", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the offline strip when the backend is lost, then says it is back", async () => {
      screenIsNarrow(false);
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderWithRouter(
        <ConnectivityProvider>
          <MainLayout>
            <p>The page</p>
          </MainLayout>
        </ConnectivityProvider>,
      );

      act(() => {
        window.dispatchEvent(new CustomEvent(API_SUCCESS_EVENT));
        window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });

      expect(screen.getByText(/^Offline - last synced at/)).toBeInTheDocument();
      expect(await screen.findByText("You are offline")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new CustomEvent(API_SUCCESS_EVENT));
      });

      expect(screen.getByText("Reconnected")).toBeInTheDocument();
      expect(screen.queryByText(/^Offline/)).not.toBeInTheDocument();
    });

    it("shows no strip while the backend answers", () => {
      screenIsNarrow(false);
      renderWithRouter(
        <ConnectivityProvider>
          <MainLayout>
            <p>The page</p>
          </MainLayout>
        </ConnectivityProvider>,
      );

      act(() => {
        window.dispatchEvent(new CustomEvent(API_SUCCESS_EVENT));
      });

      expect(screen.queryByText(/^Offline/)).not.toBeInTheDocument();
      expect(screen.queryByText("Reconnected")).not.toBeInTheDocument();
    });
  });
});
