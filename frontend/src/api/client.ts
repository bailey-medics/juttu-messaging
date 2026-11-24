/**
 * The one way the app talks to Juttu's API. Every request that changes
 * something sends Django's CSRF token back in the `X-CSRFToken` header,
 * read from the `juttu_csrftoken` cookie, which `GET /api/auth/me` sets.
 */

/** The cookie Django keeps its CSRF token in. Matches `CSRF_COOKIE_NAME`. */
export const CSRF_COOKIE = "juttu_csrftoken";

/**
 * Sent on `window` when a request cannot reach the backend, and when one
 * gets an answer from it. `ConnectivityProvider` listens for both, as
 * Quill Medical's does, to show the app offline and back again.
 */
export const NETWORK_ERROR_EVENT = "app:network-error";
export const API_SUCCESS_EVENT = "app:api-success";

/**
 * Statuses a proxy in front of the backend answers when the backend is
 * down: 502 bad gateway, 503 unavailable, 504 timed out, and 530 when a
 * tunnel's other end has gone.
 */
const GATEWAY_STATUSES = new Set([502, 503, 504, 530]);

/**
 * Whether this answer came from in front of the backend, saying the
 * backend cannot be reached. Every answer of the backend's own is JSON,
 * so a gateway status counts only when it carries none.
 */
function isBackendUnreachable(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";

  return GATEWAY_STATUSES.has(response.status) && !contentType.includes("application/json");
}

/** Tell the connectivity context what happened, on `window`. */
function announce(event: string): void {
  window.dispatchEvent(new CustomEvent(event));
}

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
 *
 * Sends `NETWORK_ERROR_EVENT` when nothing answers, or a proxy answers
 * that the backend is down, and `API_SUCCESS_EVENT` for any other answer.
 */
export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  // A file goes as a form, whose type the browser sets with its boundary.
  const isForm = body instanceof FormData;

  if (method !== "GET") {
    headers["X-CSRFToken"] = csrfToken();
  }

  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (failure) {
    announce(NETWORK_ERROR_EVENT);
    throw failure;
  }

  // An error status from the backend is still an answer: only a proxy
  // saying the backend is down counts as a lost connection.
  announce(isBackendUnreachable(response) ? NETWORK_ERROR_EVENT : API_SUCCESS_EVENT);

  const parsed = await jsonOrNull(response);

  if (!response.ok) {
    throw new ApiError(response.status, detailOf(parsed) ?? `HTTP ${response.status}`);
  }

  return parsed;
}
