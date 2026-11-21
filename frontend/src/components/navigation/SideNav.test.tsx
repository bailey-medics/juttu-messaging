import { screen } from "@testing-library/react";

import SideNav from "@/components/navigation/SideNav";
import { NAV_ITEMS } from "@/components/navigation/navItems";
import { renderWithRouter } from "@/test/test-utils";

describe("SideNav", () => {
  it("is the primary navigation", () => {
    renderWithRouter(<SideNav />);

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("lists every one of Juttu's entries", () => {
    renderWithRouter(<SideNav showIcons />);

    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("marks the page you are on", () => {
    renderWithRouter(<SideNav />, { initialRoute: "/" });

    expect(screen.getByText("Home").closest("[data-active]")).not.toBeNull();
  });

  it("closes the drawer once an entry is chosen", async () => {
    const onNavigate = vi.fn();
    renderWithRouter(<SideNav onNavigate={onNavigate} />);

    screen.getByText("Home").click();

    expect(onNavigate).toHaveBeenCalled();
  });
});
