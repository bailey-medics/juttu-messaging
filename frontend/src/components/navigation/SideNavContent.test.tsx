import { screen } from "@testing-library/react";

import SideNavContent from "@/components/navigation/SideNavContent";
import { NAV_ITEMS } from "@/components/navigation/navItems";
import { renderWithRouter } from "@/test/test-utils";

describe("SideNavContent", () => {
  it("starts with the home page, then the spaces, then settings", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/", "/spaces", "/settings"]);
  });

  it("draws a link for every entry", () => {
    renderWithRouter(<SideNavContent showIcons />);

    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("marks home only on the home page", () => {
    renderWithRouter(<SideNavContent />, { initialRoute: "/somewhere" });

    expect(screen.getByText("Home").closest("[data-active]")).toBeNull();
  });
});
