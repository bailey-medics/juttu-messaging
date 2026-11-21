/**
 * Signing in and out, and asking who is signed in: the backend's
 * `GET /api/auth/me`, `POST /api/auth/sign-in` and `POST /api/auth/sign-out`.
 *
 * The session lives in an HttpOnly cookie this page cannot read. Every
 * request that changes something sends Django's CSRF token back in the
 * `X-CSRFToken` header, read from the `juttu_csrftoken` cookie, which
 * `GET /api/auth/me` sets.
 */

/** The cookie Django keeps its CSRF token in. Matches `CSRF_COOKIE_NAME`. */
export const CSRF_COOKIE = "juttu_csrftoken";

/** The person signed in, as the backend describes them. */
export interface SessionUser {
  id: number;
  username: string;
}

/** Whether anybody is signed in, and who. */
export type Session =
  { authenticated: true; user: SessionUser } | { authenticated: false; user: null };

/** A request the backend answered with an error status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSessionUser(value: unknown): value is SessionUser {
  return isRecord(value) && typeof value.id === "number" && typeof value.username === "string";
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

/** The CSRF token from the cookie string, or an empty string if it is not set. */
export function csrfToken(cookies: string = document.cookie): string {
  const prefix = `${CSRF_COOKIE}=`;
  const found = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return found === undefined ? "" : decodeURIComponent(found.slice(prefix.length));
}

/** The backend's own `detail` message from an error body, if it gave one. */
function detailOf(body: unknown): string | null {
  return isRecord(body) && typeof body.detail === "string" ? body.detail : null;
}

/** Read a JSON body, or null when there is none to read. */
async function jsonOrNull(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();

    return body;
  } catch {
    return null;
  }
}

/**
 * Send one request to the API and return its parsed body.
 *
 * @throws ApiError when the backend answers with an error status.
 * @throws TypeError when nothing answers at all, as `fetch` does.
 */
async function request(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (method !== "GET") {
    headers["X-CSRFToken"] = csrfToken();
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await jsonOrNull(response);

  if (!response.ok) {
    throw new ApiError(response.status, detailOf(parsed) ?? `HTTP ${response.status}`);
  }

  return parsed;
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
  return sessionFrom(await request("GET", "/auth/me"));
}

/**
 * Sign in.
 *
 * @throws ApiError with status 400 for a username and password that match
 *   no account, and 429 when too many attempts came from this address.
 */
export async function signIn(username: string, password: string): Promise<Session> {
  return sessionFrom(await request("POST", "/auth/sign-in", { username, password }));
}

/** Sign out. Succeeds when nobody was signed in, too. */
export async function signOut(): Promise<void> {
  await request("POST", "/auth/sign-out");
}
