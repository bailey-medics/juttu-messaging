/// <reference types="node" />

import { readFileSync } from "node:fs";

import { screen } from "@testing-library/react";

import BubbleSpinner from "@/components/loading-spinner/BubbleSpinner";
import PageSpinner from "@/components/loading-spinner/PageSpinner";
import { renderWithMantine } from "@/test/test-utils";

/** The spinner's stylesheet, read from frontend/, where the tests run. */
const styles = readFileSync("src/components/loading-spinner/BubbleSpinner.module.css", "utf8");

describe("BubbleSpinner", () => {
  it("says Loading to a screen reader", () => {
    renderWithMantine(<BubbleSpinner />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("says what is loading when told", () => {
    renderWithMantine(<BubbleSpinner label="Loading conversations" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading conversations");
  });

  it("hides the picture from assistive technology", () => {
    const { container } = renderWithMantine(<BubbleSpinner />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    container.querySelectorAll("span[aria-hidden]").forEach((dot) => {
      expect(dot).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("holds still for somebody who has asked for less motion", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.dot\s*\{\s*animation: none;/,
    );
  });

  it("animates only transform and opacity", () => {
    const keyframes = styles.slice(
      styles.indexOf("@keyframes pulse"),
      styles.indexOf("@media (prefers-reduced-motion"),
    );
    const properties = [...keyframes.matchAll(/^\s+([a-z-]+):/gm)].map((match) => match[1]);

    expect(new Set(properties)).toEqual(new Set(["opacity", "transform"]));
  });
});

describe("PageSpinner", () => {
  it("shows one spinner, and says Loading", () => {
    renderWithMantine(<PageSpinner />);

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
});
