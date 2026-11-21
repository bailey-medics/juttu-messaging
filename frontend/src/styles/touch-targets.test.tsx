/**
 * touch-targets.css sizes controls through Mantine's static class names,
 * such as `.mantine-CloseButton-root`. jsdom cannot apply its media query
 * or measure a size, so these tests guard the other half: that the
 * controls the rule is meant to reach still carry the class it selects.
 * If Mantine renamed a class, or a modal stopped using CloseButton, the
 * rule would silently match nothing and these would fail.
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Button, Modal } from "@mantine/core";
import { renderWithMantine } from "@/test/test-utils";

// The form fields' cases come with the form components, in Phase 5 of the
// Quill components plan.
describe("touch-targets.css selectors", () => {
  it("reaches the modal close button", () => {
    renderWithMantine(
      <Modal opened onClose={vi.fn()} title="Example">
        Body
      </Modal>,
    );
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(close).toHaveClass("mantine-CloseButton-root");
  });

  it("reaches a compact xs button", () => {
    renderWithMantine(<Button size="xs">Deactivate</Button>);
    expect(screen.getByRole("button", { name: "Deactivate" })).toHaveClass(
      "mantine-Button-root",
    );
  });
});
