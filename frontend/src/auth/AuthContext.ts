/**
 * Who is signed in, for every page. Ported from Quill Medical's
 * `AuthContext`, without its two-factor code, roles and patient fields.
 * `AuthProvider` fills it; `useAuth` reads it.
 */

import { createContext, useContext } from "react";

import type { SessionUser } from "@/api/auth";

/**
 * What is known about the session.
 *
 * - `loading`: the backend has not been asked yet.
 * - `unauthenticated`: nobody is signed in. `signedOut` is true straight
 *   after signing out on purpose, so the next person on this device is not
 *   sent back to the last person's page.
 * - `authenticated`: somebody is, and this is who.
 * - `unreachable`: the backend could not be asked, so nobody knows. Not the
 *   same as signed out: a dropped connection ends nobody's session.
 */
export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated"; signedOut: boolean }
  | { status: "authenticated"; user: SessionUser }
  | { status: "unreachable" };

export interface AuthContextValue {
  state: AuthState;
  /**
   * Sign in. Rejects with the backend's `ApiError`, or a `TypeError` when
   * nothing answered, for the sign-in page to explain.
   */
  signIn: (username: string, password: string) => Promise<void>;
  /**
   * Sign out. Rejects when the backend could not be reached, because the
   * session cookie is then still there and the person still signed in.
   */
  signOut: () => Promise<void>;
  /** Ask the backend again who is signed in. */
  reload: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** The session and what can be done to it. Only inside `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (value === undefined) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
