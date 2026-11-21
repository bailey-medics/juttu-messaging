import { ApiError } from "@/api/client";

export const API_UNREACHABLE = "Could not reach Juttu. Check your connection and try again.";

/** What to tell somebody whose request failed, from any page. */
export function apiFailure(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiError && error.status === 403) {
    return "You are not allowed to do that.";
  }

  return API_UNREACHABLE;
}
