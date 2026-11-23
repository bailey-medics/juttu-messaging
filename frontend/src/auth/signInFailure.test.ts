import { ApiError } from "@/api/auth";

import { SIGN_IN_UNREACHABLE, signInFailure, TOO_MANY_ATTEMPTS } from "./signInFailure";

describe("signInFailure", () => {
  it("gives the backend's own message for a wrong username or password", () => {
    expect(signInFailure(new ApiError(400, "No match."))).toBe("No match.");
  });

  it("says to wait after too many attempts", () => {
    expect(signInFailure(new ApiError(429, "Request was throttled."))).toBe(TOO_MANY_ATTEMPTS);
  });

  it.each([new TypeError("no network"), new ApiError(502, "Bad gateway"), "odd"])(
    "says Juttu could not be reached for %s",
    (error) => {
      expect(signInFailure(error)).toBe(SIGN_IN_UNREACHABLE);
    },
  );
});
