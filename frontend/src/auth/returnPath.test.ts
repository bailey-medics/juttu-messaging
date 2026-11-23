import { returnPath } from "./returnPath";

describe("returnPath", () => {
  it("returns to the page somebody first asked for", () => {
    expect(returnPath({ from: "/spaces/release?tab=cards" })).toBe("/spaces/release?tab=cards");
  });

  it.each([undefined, null, {}, { from: 3 }, { from: "spaces" }])(
    "goes home for %j",
    (state) => {
      expect(returnPath(state)).toBe("/");
    },
  );

  it.each(["//elsewhere.example", "/\\elsewhere.example", "https://elsewhere.example"])(
    "never leaves the app for %s",
    (from) => {
      expect(returnPath({ from })).toBe("/");
    },
  );
});
