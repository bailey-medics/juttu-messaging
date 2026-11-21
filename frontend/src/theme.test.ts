import breakpoints from "@/breakpoints.json";
import { primaryScale, theme } from "@/theme";

describe("theme", () => {
  it("sets body text at 19px on every screen", () => {
    expect(theme.fontSizes?.md).toBe("1.1875rem");
  });

  it("gives the primary colour the ten shades Mantine needs", () => {
    expect(primaryScale).toHaveLength(10);
    expect(theme.colors?.primary).toBe(primaryScale);
  });

  it("reads its breakpoints from the file PostCSS reads", () => {
    expect(theme.breakpoints).toEqual(breakpoints);
  });
});
