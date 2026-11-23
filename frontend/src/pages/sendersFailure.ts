import { ApiError } from "@/api/client";

import { API_UNREACHABLE } from "./apiFailure";

/** What to tell an admin whose change to the senders failed. */
export function sendersFailure(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiError && error.status === 403) {
    return "Only an organisation admin can manage senders.";
  }

  return API_UNREACHABLE;
}
