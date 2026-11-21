import { ApiError } from "@/api/client";

export const MEMBERS_UNREACHABLE =
  "Could not reach Juttu. Check your connection and try again.";

/** What to tell an admin whose change to the members failed. */
export function membersFailure(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiError && error.status === 403) {
    return "Only an organisation admin can manage members.";
  }

  return MEMBERS_UNREACHABLE;
}
