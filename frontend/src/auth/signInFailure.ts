import { ApiError } from "@/api/auth";

export const TOO_MANY_ATTEMPTS = "Too many sign-in attempts. Wait a minute, then try again.";
export const SIGN_IN_UNREACHABLE =
  "Could not reach Juttu. Check your connection and try again.";

/**
 * What to tell somebody whose sign-in failed. The backend's own message for
 * a username and password that match no account, which it words the same
 * whatever went wrong. The rate limit's answer carries no message a person
 * should read, so it gets its own, as in Quill Medical.
 */
export function signInFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return TOO_MANY_ATTEMPTS;
    }

    if (error.status === 400) {
      return error.message;
    }
  }

  return SIGN_IN_UNREACHABLE;
}
