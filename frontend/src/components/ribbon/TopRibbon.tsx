/**
 * The ribbon along the top of every page: Juttu's name, linking home, on
 * the brand navy, with Quill Medical's amber rule beneath.
 *
 * Ported from Quill Medical's TopRibbon, without the patient details, the
 * patient search and the burger menu, which Juttu does not have yet. Quill
 * shows its wordmark image; Juttu's name is set in text until it has one.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { appIdentity } from "@/theme";
import classes from "./TopRibbon.module.css";

export interface TopRibbonProps {
  /** What a page shows in the middle of the ribbon. */
  children?: ReactNode;
  /** Content pinned to the right-hand end, such as the install button. */
  rightSection?: ReactNode;
}

export default function TopRibbon({ children, rightSection }: TopRibbonProps) {
  const brandClasses = rightSection ? `${classes.brand} ${classes.brandYields}` : classes.brand;

  return (
    <div className={classes.cq}>
      <Link to="/" className={brandClasses}>
        <Text component="span" fw={700} size="lg" c="white">
          {appIdentity.name}
        </Text>
      </Link>
      <div className={classes.middle}>{children}</div>
      {rightSection && <div className={classes.end}>{rightSection}</div>}
    </div>
  );
}
