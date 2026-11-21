import ErrorState from "@/components/error-state/ErrorState";

import { useAuth } from "./AuthContext";

export const CANNOT_REACH = "Could not reach Juttu. Check your connection.";

/**
 * What a guarded page shows when the backend could not be asked who is
 * signed in. Not the sign-in page: nothing has said the session is over.
 * `AuthProvider` keeps asking, so this goes by itself when the connection
 * is back; the button asks at once. Ported from Quill Medical.
 */
export default function CannotReach() {
  const { reload } = useAuth();

  return (
    <ErrorState
      variant="page"
      title="No connection"
      message={CANNOT_REACH}
      action={{ label: "Try again", onClick: () => void reload() }}
    />
  );
}
