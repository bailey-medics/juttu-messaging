/**
 * The "Sign out" entry at the foot of the side navigation. An action, not a
 * page. Ported from Quill Medical's `LogoutNavLink`.
 *
 * Signing out can fail: no network, or the backend not answering. The
 * session cookie is then still in the browser, so the next person to use it
 * would be signed in as the last. So a failure is said here, beneath the
 * link, and the drawer stays open on it: `onNavigate`, which closes the
 * drawer on a phone, is called only once the backend has ended the session.
 */

import { NavLink } from "@mantine/core";
import { useState } from "react";

import NavIcon from "@/components/icons/NavIcon";
import LiveStatus from "@/components/live-status";
import ErrorMessage from "@/components/typography/ErrorMessage";

import { navLinkStyles } from "./navStyles";

export const SIGN_OUT_FAILED = "Could not sign you out. Check your connection and try again.";

export interface SignOutNavLinkProps {
  /** Ends the session. Rejects when it could not be ended. */
  onSignOut: () => Promise<void>;
  /** Whether to show the icon beside the label. */
  showIcons?: boolean;
  /** Called once signed out, to close the drawer. */
  onNavigate?: () => void;
}

export default function SignOutNavLink({
  onSignOut,
  showIcons = true,
  onNavigate,
}: SignOutNavLinkProps) {
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    // A disabled link is only greyed out by its styles, so a second press
    // is turned away here.
    if (signingOut) {
      return;
    }

    setFailed(false);
    setSigningOut(true);

    try {
      await onSignOut();
    } catch {
      setFailed(true);
      setSigningOut(false);
      return;
    }

    setSigningOut(false);
    onNavigate?.();
  }

  return (
    <>
      <NavLink
        component="button"
        type="button"
        label="Sign out"
        description={failed ? <ErrorMessage>{SIGN_OUT_FAILED}</ErrorMessage> : undefined}
        disabled={signingOut}
        styles={navLinkStyles}
        onClick={() => void signOut()}
        leftSection={showIcons ? <NavIcon name="logout" /> : undefined}
      />
      <LiveStatus message={failed ? SIGN_OUT_FAILED : ""} />
    </>
  );
}
