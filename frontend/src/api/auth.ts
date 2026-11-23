/**
 * Signing in and out, and asking who is signed in: the backend's
 * `GET /api/auth/me`, `POST /api/auth/sign-in` and `POST /api/auth/sign-out`.
 *
 * The session lives in an HttpOnly cookie this page cannot read.
 */

import { ApiError, apiRequest, isRecord } from "@/api/client";

export { ApiError, CSRF_COOKIE, csrfToken } from "@/api/client";

/** The person signed in, as the backend describes them. */
export interface SessionUser {
  id: number;
  username: string;
  /** Their name, or their username where the account has none. */
  name: string;
  /** Whether they are an admin of the organisation. */
  is_admin: boolean;
}

/** Whether anybody is signed in, and who. */
export type Session =
  { authenticated: true; user: SessionUser } | { authenticated: false; user: null };

function isSessionUser(value: unknown): value is SessionUser {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.username === "string" &&
    typeof value.name === "string" &&
    typeof value.is_admin === "boolean"
  );
}

/** Whether a parsed body is the backend's answer about the session. */
export function isSession(body: unknown): body is Session {
  if (!isRecord(body)) {
    return false;
  }

  if (body.authenticated === true) {
    return isSessionUser(body.user);
  }

  return body.authenticated === false && body.user === null;
}

/** Turn a body into a session, or refuse one that is not. */
function sessionFrom(body: unknown): Session {
  if (!isSession(body)) {
    throw new ApiError(502, "The backend's answer about the session was not understood");
  }

  return body;
}

/** Ask the backend who is signed in. Also sets the CSRF cookie. */
export async function getSession(): Promise<Session> {
  return sessionFrom(await apiRequest("GET", "/auth/me"));
}

/**
 * Sign in.
 *
 * @throws ApiError with status 400 for a username and password that match
 *   no account, and 429 when too many attempts came from this address.
 */
export async function signIn(username: string, password: string): Promise<Session> {
  return sessionFrom(await apiRequest("POST", "/auth/sign-in", { username, password }));
}

/** Sign out. Succeeds when nobody was signed in, too. */
export async function signOut(): Promise<void> {
  await apiRequest("POST", "/auth/sign-out");
}
