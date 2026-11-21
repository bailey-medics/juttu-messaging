/// <reference types="node" />

import { readFileSync } from "node:fs";

import { screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import TopRibbon from "@/components/ribbon/TopRibbon";
import { renderWithTheme } from "@/test/render";

/**
 * The ribbon's stylesheet, read from disk, from frontend/, where the tests
 * run: Vitest hands a CSS module to a test as class names, not as its text.
 */
const ribbonStyles = readFileSync("src/components/ribbon/TopRibbon.module.css", "utf8");

/** Render the ribbon on a page, inside a router, as the app does. */
function renderRibbon(element: ReactElement) {
  const router = createMemoryRouter([{ path: "/", element }]);

  return renderWithTheme(<RouterProvider router={router} />);
}

describe("TopRibbon", () => {
  it("shows Juttu's name, linking home", () => {
    renderRibbon(<TopRibbon />);

    expect(screen.getByRole("link", { name: "Juttu" })).toHaveAttribute("href", "/");
  });

  it("renders a right section beside the name", () => {
    renderRibbon(<TopRibbon rightSection={<button type="button">Install Juttu</button>} />);

    expect(screen.getByRole("button", { name: "Install Juttu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Juttu" })).toBeInTheDocument();
  });

  it("renders no right-hand slot when there is nothing to put in it", () => {
    const { container } = renderRibbon(<TopRibbon />);

    expect(container.querySelectorAll("a ~ div")).toHaveLength(1);
  });

  it("shows what a page puts in the middle", () => {
    renderRibbon(
      <TopRibbon>
        <span>Team space</span>
      </TopRibbon>,
    );

    expect(screen.getByText("Team space")).toBeInTheDocument();
  });

  it("draws the brand amber rule along its bottom, as Quill's ribbon does", () => {
    expect(ribbonStyles).toContain("border-bottom: 4px solid var(--brand-secondary);");
  });

  it("sits on the ribbon colour, which follows the colour scheme", () => {
    expect(ribbonStyles).toContain("background: var(--ribbon-bg);");
  });
});
