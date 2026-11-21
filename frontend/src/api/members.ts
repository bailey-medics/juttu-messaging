/**
 * The organisation's members, for an organisation admin: the backend's
 * `GET` and `POST /api/members`, `POST /api/members/{id}/remove` and
 * `POST /api/members/{id}/make-admin`. Anybody else is refused with 403.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";

/** One current member, as the backend lists them. */
export interface Member {
  id: number;
  username: string;
  /** Their name, or their username where the account has none. */
  name: string;
  is_admin: boolean;
}

/** What an admin types to add a person. */
export interface NewMember {
  name: string;
  username: string;
  password: string;
}

/** Whether a parsed value is one member. */
export function isMember(value: unknown): value is Member {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.username === "string" &&
    typeof value.name === "string" &&
    typeof value.is_admin === "boolean"
  );
}

function notUnderstood(): ApiError {
  return new ApiError(502, "The backend's answer about the members was not understood");
}

/** Every current member, by name. */
export async function listMembers(): Promise<Member[]> {
  const body = await apiRequest("GET", "/members");
  const members = isRecord(body) ? body.members : undefined;

  if (!Array.isArray(members) || !members.every(isMember)) {
    throw notUnderstood();
  }

  return members;
}

/**
 * Add a person, who can sign in at once with the password given.
 *
 * @throws ApiError with status 400 and the backend's reason for a username
 *   that is taken or a password that breaks the rules.
 */
export async function addMember(person: NewMember): Promise<Member> {
  const body = await apiRequest("POST", "/members", person);

  if (!isMember(body)) {
    throw notUnderstood();
  }

  return body;
}

/** Remove a member: their account is closed, and they are signed out. */
export async function removeMember(id: number): Promise<void> {
  await apiRequest("POST", `/members/${id}/remove`);
}

/** Make a member an organisation admin. */
export async function makeAdmin(id: number): Promise<void> {
  await apiRequest("POST", `/members/${id}/make-admin`);
}
