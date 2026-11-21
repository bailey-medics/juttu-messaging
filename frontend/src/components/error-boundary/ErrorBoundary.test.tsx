import { screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import RouteErrorFallback from "@/components/error-boundary/RouteErrorFallback";
import { renderWithMantine } from "@/test/test-utils";

function Broken(): never {
  throw new Error("This page broke");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows its children while nothing goes wrong", () => {
    renderWithMantine(
      <ErrorBoundary>
        <p>All well</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("All well")).toBeInTheDocument();
  });

  it("shows the fallback page, not a white screen, when a child throws", () => {
    renderWithMantine(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });

  it("logs the error for a developer", () => {
    renderWithMantine(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      "ErrorBoundary caught:",
      expect.any(Error),
      expect.anything(),
    );
  });
});

describe("RouteErrorFallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows the same fallback when a route fails, not the router's own screen", async () => {
    const router = createMemoryRouter([
      { path: "/", element: <Broken />, errorElement: <RouteErrorFallback /> },
    ]);

    renderWithMantine(<RouterProvider router={router} />);

    expect(await screen.findByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument();
  });
});
