/**
 * BubbleSpinner Component
 *
 * Juttu's speech bubble, with three dots pulsing inside it: the one spinner
 * Juttu shows for a wait. Use it as it is for part of a page already on
 * screen, and `PageSpinner` where the wait stands in for the whole page.
 * Quill Medical turns its quill in the same places; this is Juttu's own.
 *
 * A picture with no text says nothing to a screen reader, so the graphic
 * is hidden from assistive technology and paired with a visually hidden
 * `role="status"` saying "Loading" (WCAG 4.1.3 Status messages).
 *
 * The animation is all in the CSS module, which stills it for somebody who
 * has asked their device for less motion.
 */

import { Box, VisuallyHidden, type BoxProps } from "@mantine/core";

import classes from "./BubbleSpinner.module.css";

export interface BubbleSpinnerProps {
  /** What is loading, read out by screen readers. Defaults to "Loading". */
  label?: string;
  /** Width and height, as Mantine's `w` and `h` take them. Defaults to 4rem. */
  size?: BoxProps["w"];
}

export default function BubbleSpinner({
  label = "Loading",
  size = "4rem",
}: BubbleSpinnerProps) {
  return (
    <Box className={classes.spinner} w={size} h={size}>
      {/* The same bubble as Juttu's icon, drawn by scripts/make-icons.py. */}
      <svg
        className={classes.bubble}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="50" cy="46" rx="30" ry="23" />
        <polygon points="34,60 48,64 30,78" />
      </svg>
      <span className={classes.dot} aria-hidden="true" />
      <span className={classes.dot} aria-hidden="true" />
      <span className={classes.dot} aria-hidden="true" />
      <VisuallyHidden role="status">{label}</VisuallyHidden>
    </Box>
  );
}
