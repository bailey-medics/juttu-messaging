/**
 * The backend's health check, `GET /api/health`.
 */

/** What the backend answers when it is up. */
export interface HealthResponse {
  status: "ok";
}

/** Whether a parsed body is the health check's answer. */
export function isHealthResponse(body: unknown): body is HealthResponse {
  return typeof body === "object" && body !== null && "status" in body && body.status === "ok";
}

/**
 * Ask the backend whether it is up.
 *
 * @returns true when it answered with `{"status": "ok"}`, false for any other
 *   answer, an error status or no answer at all.
 */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { signal });
    if (!response.ok) {
      return false;
    }

    const body: unknown = await response.json();

    return isHealthResponse(body);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    return false;
  }
}
