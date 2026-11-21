/**
 * PageSpinner Component
 *
 * The bubble spinner, standing in for a whole page: while a page's content
 * arrives, or the router is still loading one.
 *
 * Ported from Quill Medical's, with Juttu's speech bubble where Quill turns
 * its quill. It exists so that every such wait puts the spinner in exactly
 * the same place at exactly the same size. For a wait inside a page that is
 * already showing, use `BubbleSpinner` itself.
 */

import { Center } from "@mantine/core";

import BubbleSpinner from "./BubbleSpinner";

export interface PageSpinnerProps {
  /** What is loading, read out by screen readers. Defaults to "Loading". */
  label?: string;
}

export default function PageSpinner({ label = "Loading" }: PageSpinnerProps) {
  return (
    <Center mih="60dvh">
      <BubbleSpinner size="8rem" label={label} />
    </Center>
  );
}
