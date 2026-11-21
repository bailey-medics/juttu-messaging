import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getSession, signIn as apiSignIn, signOut as apiSignOut } from "@/api/auth";

import { AuthContext, type AuthState, type AuthContextValue } from "./AuthContext";

/** How long to wait before asking again while the backend is out of reach. */
export const RETRY_UNREACHABLE_MS = 5_000;

/**
 * Asks the backend who is signed in when the app opens, and keeps the
 * answer for every page. Ported from Quill Medical's `AuthProvider`.
 *
 * While the backend cannot be reached it asks again every few seconds, and
 * at once when the browser says the connection is back.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const reload = useCallback(async (): Promise<void> => {
    try {
      const session = await getSession();

      setState(
        session.authenticated
          ? { status: "authenticated", user: session.user }
          : { status: "unauthenticated", signedOut: false },
      );
    } catch {
      // A failure says nothing about the session, so what is already known
      // is kept. Only a session never established is left unknown.
      setState((current) =>
        current.status === "loading" || current.status === "unreachable"
          ? { status: "unreachable" }
          : current,
      );
    }
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<void> => {
    const session = await apiSignIn(username, password);

    if (session.authenticated) {
      setState({ status: "authenticated", user: session.user });
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await apiSignOut();

    setState({ status: "unauthenticated", signedOut: true });
  }, []);

  useEffect(() => {
    // The first question, asked once when the app opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the answer arrives later
    void reload();
  }, [reload]);

  const unreachable = state.status === "unreachable";

  useEffect(() => {
    if (!unreachable) {
      return;
    }

    const timer = window.setInterval(() => void reload(), RETRY_UNREACHABLE_MS);
    const whenOnline = () => void reload();
    window.addEventListener("online", whenOnline);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", whenOnline);
    };
  }, [unreachable, reload]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, reload }),
    [state, signIn, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
