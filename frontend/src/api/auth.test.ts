import { ApiError, csrfToken, getSession, isSession, signIn, signOut } from "@/api/auth";
import { SIGNED_IN, SIGNED_OUT, stubFetchJson } from "@/test/render";

describe("isSession", () => {
  it.each([SIGNED_IN, SIGNED_OUT])("accepts %j", (body) => {
    expect(isSession(body)).toBe(true);
  });

  it.each([
    null,
    {},
    { authenticated: true, user: null },
    { authenticated: true, user: { id: "1", username: "sam" } },
    { authenticated: true, user: { id: 1, username: "sam", name: "Sam" } },
    { authenticated: false, user: { id: 1, username: "sam" } },
    { authenticated: "yes", user: null },
  ])("refuses %j", (body) => {
    expect(isSession(body)).toBe(false);
  });
});

describe("csrfToken", () => {
  it("reads Juttu's CSRF cookie among others", () => {
    expect(csrfToken("csrftoken=turva; juttu_csrftoken=abc%3D; other=1")).toBe("abc=");
  });

  it("is empty when the cookie is not set", () => {
    expect(csrfToken("csrftoken=turva")).toBe("");
  });
});

describe("the requests", () => {
  afterEach(() => {
    document.cookie = "juttu_csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("asks who is signed in", async () => {
    stubFetchJson(SIGNED_IN);

    await expect(getSession()).resolves.toEqual(SIGNED_IN);
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("signs in with the CSRF token in its header", async () => {
    document.cookie = "juttu_csrftoken=token-from-cookie";
    stubFetchJson(SIGNED_IN);

    await signIn("sam", "a password");

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/sign-in",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "sam", password: "a password" }),
        headers: expect.objectContaining({ "X-CSRFToken": "token-from-cookie" }),
      }),
    );
  });

  it("refuses with the backend's message and status", async () => {
    stubFetchJson({ detail: "That username and password do not match an account." }, 400);

    await expect(signIn("sam", "wrong")).rejects.toEqual(
      new ApiError(400, "That username and password do not match an account."),
    );
  });

  it("refuses an answer that is not a session", async () => {
    stubFetchJson({ status: "ok" });

    await expect(getSession()).rejects.toBeInstanceOf(ApiError);
  });

  it("signs out with the CSRF token in its header", async () => {
    document.cookie = "juttu_csrftoken=token-from-cookie";
    stubFetchJson(SIGNED_OUT);

    await signOut();

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-CSRFToken": "token-from-cookie" }),
      }),
    );
  });
});
