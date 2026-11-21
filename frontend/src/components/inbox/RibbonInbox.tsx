/**
 * RibbonInbox Component
 *
 * The envelope in the top ribbon, with how many things are waiting on
 * the person signed in: grey while nothing is, amber with a count while
 * anything is, as in Quill Medical.
 *
 * Quill's fetches its count from the inbox API for the person signed in.
 * Juttu has no accounts or inbox yet, so the count comes in as a prop, and
 * with no count, which means nobody is signed in, it draws nothing.
 */

import { useNavigate } from "react-router";

import InboxButton from "./InboxButton";

/** Where the inbox page will live. */
export const INBOX_PATH = "/inbox";

type Props = {
  /** How many things are waiting on the person signed in; none when nobody is. */
  count?: number;
};

export default function RibbonInbox({ count }: Props) {
  const navigate = useNavigate();

  if (count === undefined) {
    return null;
  }

  return (
    <InboxButton label="Inbox" count={count} onDark onClick={() => void navigate(INBOX_PATH)} />
  );
}
