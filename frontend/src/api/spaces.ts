/**
 * Spaces and their members: the backend's `/api/spaces` routes. A space the
 * caller is not in answers 404, as one that does not exist.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";

export interface Space {
  id: number;
  name: string;
  is_clinical: boolean;
}

/** One person in a space. */
export interface SpacePerson {
  id: number;
  username: string;
  name: string;
}

export function isSpace(value: unknown): value is Space {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.is_clinical === "boolean"
  );
}

export function isSpacePerson(value: unknown): value is SpacePerson {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.username === "string" &&
    typeof value.name === "string"
  );
}

function notUnderstood(): ApiError {
  return new ApiError(502, "The backend's answer about spaces was not understood");
}

/** A list under *key* in *body*, every item checked by *guard*. */
export function listOf<T>(
  body: unknown,
  key: string,
  guard: (value: unknown) => value is T,
): T[] {
  const items = isRecord(body) ? body[key] : undefined;

  if (!Array.isArray(items) || !items.every(guard)) {
    throw notUnderstood();
  }

  return items;
}

/** The spaces the caller is in, by name. */
export async function listSpaces(): Promise<Space[]> {
  return listOf(await apiRequest("GET", "/spaces"), "spaces", isSpace);
}

/** Make a space, not clinical, with the caller as its first member. */
export async function createSpace(name: string): Promise<Space> {
  const body = await apiRequest("POST", "/spaces", { name });

  if (!isSpace(body)) {
    throw notUnderstood();
  }

  return body;
}

/** One space the caller is in. */
export async function getSpace(id: number): Promise<Space> {
  const body = await apiRequest("GET", `/spaces/${id}`);

  if (!isSpace(body)) {
    throw notUnderstood();
  }

  return body;
}

/** Who is in a space, by name. */
export async function listSpaceMembers(id: number): Promise<SpacePerson[]> {
  return listOf(await apiRequest("GET", `/spaces/${id}/members`), "members", isSpacePerson);
}

/** Put a member of the organisation in a space. */
export async function addToSpace(spaceId: number, userId: number): Promise<void> {
  await apiRequest("POST", `/spaces/${spaceId}/members`, { user_id: userId });
}

/** Take somebody out of a space. */
export async function removeFromSpace(spaceId: number, userId: number): Promise<void> {
  await apiRequest("POST", `/spaces/${spaceId}/members/${userId}/remove`);
}
