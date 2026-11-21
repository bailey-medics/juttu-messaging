import { screen, within } from "@testing-library/react";

import { createMemoryRouter, RouterProvider } from "react-router";

import RootLayout from "@/RootLayout";
import { routes } from "@/routes";
import { renderAt, renderWithTheme, stubFetchJson } from "@/test/render";

describe("routes", () => {
  beforeEach(() => {
    stubFetchJson({ status: "ok" });
  });

  it("shows the home page at /", async () => {
    renderAt("/");

    expect(await screen.findByText("Backend up")).toBeInTheDocument();
  });

  it("shows every page inside the root layout's header", () => {
    renderAt("/");

    expect(screen.getByRole("banner")).toHaveTextContent("Juttu");
  });

  it("puts Quill's top ribbon in the header, with Juttu's name linking home", () => {
    renderAt("/");

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Juttu" })).toHaveAttribute("href", "/");
  });

  it("gives the ribbon no right section while no install is on offer", () => {
    renderAt("/");

    const header = screen.getByRole("banner");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
    expect(header.querySelectorAll("a ~ div")).toHaveLength(1);
  });

  it("shows the not found page for an unknown address", () => {
    renderAt("/no/such/page");

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("keeps the ribbon and shows the fallback when a page throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Broken(): never {
      throw new Error("This page broke");
    }
    const router = createMemoryRouter([
      { element: <RootLayout />, children: [{ index: true, element: <Broken /> }] },
    ]);

    renderWithTheme(<RouterProvider router={router} />);

    expect(screen.getByRole("banner")).toHaveTextContent("Juttu");
    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
  });

  it("gives the root route Juttu's error page and its page spinner", () => {
    const [root] = routes;

    expect(root?.errorElement).toBeDefined();
    expect(root?.hydrateFallbackElement).toBeDefined();
  });
});
