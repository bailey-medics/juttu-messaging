import { ApiError } from "@/api/client";
import { addMember, isMember, listMembers, makeAdmin, removeMember } from "@/api/members";
import { stubFetchJson } from "@/test/render";

const priya = { id: 3, username: "priya", name: "Priya Shah", is_admin: false };

describe("isMember", () => {
  it("accepts a member", () => {
    expect(isMember(priya)).toBe(true);
  });

  it.each([null, {}, { ...priya, id: "3" }, { ...priya, is_admin: "no" }])(
    "refuses %j",
    (value) => {
      expect(isMember(value)).toBe(false);
    },
  );
});

describe("the members requests", () => {
  it("lists the members", async () => {
    stubFetchJson({ members: [priya] });

    await expect(listMembers()).resolves.toEqual([priya]);
    expect(fetch).toHaveBeenCalledWith(
      "/api/members",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("refuses a list it does not understand", async () => {
    stubFetchJson({ members: [{ id: 3 }] });

    await expect(listMembers()).rejects.toBeInstanceOf(ApiError);
  });

  it("adds a person and gives back the new member", async () => {
    stubFetchJson(priya, 201);

    const added = await addMember({
      name: "Priya Shah",
      username: "priya",
      password: "a long made-up passphrase",
    });

    expect(added).toEqual(priya);
    expect(fetch).toHaveBeenCalledWith(
      "/api/members",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Priya Shah",
          username: "priya",
          password: "a long made-up passphrase",
        }),
      }),
    );
  });

  it("passes on the backend's reason for refusing", async () => {
    stubFetchJson({ detail: "That username is taken." }, 400);

    await expect(addMember({ name: "P", username: "priya", password: "x" })).rejects.toEqual(
      new ApiError(400, "That username is taken."),
    );
  });

  it("removes a member and makes one an admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await removeMember(3);
    await makeAdmin(4);

    expect(fetch).toHaveBeenCalledWith(
      "/api/members/3/remove",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/members/4/make-admin",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
