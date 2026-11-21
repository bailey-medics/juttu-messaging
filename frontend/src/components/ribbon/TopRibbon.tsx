/**
 * The ribbon along the top of every page: Juttu's name, linking home, on
 * the brand navy, with Quill Medical's amber rule beneath.
 *
 * Ported from Quill Medical's TopRibbon, without the patient details and
 * the patient search, which Juttu does not have. On a narrow screen the
 * burger opens the side navigation, and the name gives way to it, so the
 * burger and the name never show together, as in Quill. Quill
 * shows its wordmark image; Juttu's name is set in text until it has one.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router";

import BurgerButton from "@/components/button/BurgerButton";
import { appIdentity } from "@/theme";
import classes from "./TopRibbon.module.css";

export interface TopRibbonProps {
  /** Opens the side navigation drawer, on a narrow screen. */
  onBurgerClick?: () => void;
  /** Whether the side navigation drawer is open, for assistive technology. */
  navOpen?: boolean;
  /** Whether to use the narrow layout: the burger in place of the name. */
  isNarrow?: boolean;
  /** What a page shows in the middle of the ribbon. */
  children?: ReactNode;
  /** Content pinned to the right-hand end, such as the install button. */
  rightSection?: ReactNode;
}

export default function TopRibbon({
  children,
  rightSection,
  onBurgerClick,
  navOpen = false,
  isNarrow = false,
}: TopRibbonProps) {
  const brandClasses = rightSection ? `${classes.brand} ${classes.brandYields}` : classes.brand;

  return (
    <div className={classes.cq}>
      {isNarrow && onBurgerClick && (
        <div className={classes.left}>
          <BurgerButton navOpen={navOpen} onClick={onBurgerClick} />
        </div>
      )}
      {!isNarrow && (
        <Link to="/" className={brandClasses}>
          <Text component="span" fw={700} size="lg" c="white">
            {appIdentity.name}
          </Text>
        </Link>
      )}
      <div className={classes.middle}>{children}</div>
      {rightSection && <div className={classes.end}>{rightSection}</div>}
    </div>
  );
}
