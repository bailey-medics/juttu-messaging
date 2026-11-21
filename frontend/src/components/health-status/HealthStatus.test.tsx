import { screen } from "@testing-library/react";

import HealthStatus from "@/components/health-status/HealthStatus";
import { renderWithTheme } from "@/test/render";

describe("HealthStatus", () => {
  it.each([
    ["checking", "Checking"],
    ["up", "Backend up"],
    ["down", "Backend down"],
  ] as const)("names the %s state", (state, label) => {
    renderWithTheme(<HealthStatus state={state} />);

    expect(screen.getByRole("status")).toHaveTextContent(label);
  });

  it("is announced to a screen reader when it changes", () => {
    renderWithTheme(<HealthStatus state="up" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
