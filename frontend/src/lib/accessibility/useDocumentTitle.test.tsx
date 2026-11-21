import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import brand from "@/brand.json";
import { documentTitle, useDocumentTitle } from "./useDocumentTitle";

const original = document.title;

describe("useDocumentTitle", () => {
  afterEach(() => {
    document.title = original;
  });

  it("puts the page first and the site second", () => {
    expect(documentTitle("Settings")).toBe("Settings - Juttu");
  });

  it("takes the site's name from brand.json, not from index.html", () => {
    // Quill's version of this test builds the app as another of its
    // brands. Juttu has one brand, so the name comes from brand.json,
    // whatever the static index.html said before the app started.
    document.title = "Something else";

    expect(documentTitle("Settings")).toBe(`Settings - ${brand.identity.name}`);
  });

  it("sets the title while mounted and restores it after", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Team space"));
    expect(document.title).toBe(documentTitle("Team space"));
    unmount();
    expect(document.title).toBe(original);
  });

  it("follows a change of page title", () => {
    const { rerender } = renderHook(({ title }: { title: string }) => useDocumentTitle(title), {
      initialProps: { title: "Question 1" },
    });
    rerender({ title: "Question 2" });
    expect(document.title).toBe(documentTitle("Question 2"));
  });

  it("leaves the title alone when there is none to give", () => {
    renderHook(() => useDocumentTitle(""));
    expect(document.title).toBe(original);
  });
});
