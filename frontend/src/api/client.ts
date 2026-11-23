/**
 * The one way the app talks to Juttu's API. Every request that changes
 * something sends Django's CSRF token back in the `X-CSRFToken` header,
 * read from the `juttu_csrftoken` cookie, which `GET /api/auth/me` sets.
 */

/** The cookie Django keeps its CSRF token in. Matches `CSRF_COOKIE_NAME`. */
export const CSRF_COOKIE = "juttu_csrftoken";

/** A request the backend answered with an error status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Whether a value is a plain object, for the type guards. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
export async function apiRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<unknown> {
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
