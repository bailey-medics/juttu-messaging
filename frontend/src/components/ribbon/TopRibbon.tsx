/**
 * The ribbon along the top of every page: Juttu's name, linking home, on
 * the brand navy, with Quill Medical's amber rule beneath.
 *
 * Ported from Quill Medical's TopRibbon, without the patient details and
 * the patient search, which Juttu does not have. On a narrow screen the
 * burger opens the side navigation, and the name gives way to it, so the
 * burger and the name never show together, as in Quill. Juttu's name is
 * its wordmark: "Juttu" in Finlandica Headline 700, Finland's
 * country-brand typeface, drawn as a white SVG with each letter a path, so
 * no font loads. It is drawn as Turva's wordmark was.
 */

import { Image } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router";

import BurgerButton from "@/components/button/BurgerButton";
import { appIdentity } from "@/theme";
import classes from "./TopRibbon.module.css";

/** The wordmark, in `frontend/public/`. */
const WORDMARK_SRC = "/wordmark-white.svg";

/**
 * The wordmark's height. The name was 24px text in Atkinson Hyperlegible
 * Next, whose capitals are 0.668 of its size: 16.0px. Asked for 40% bigger,
 * the J stands 22.4px. The drawing's box is 770 units tall around a
 * 700-unit capital, so the image is 24.7px, 1.543rem.
 */
const WORDMARK_HEIGHT = "1.543rem";

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
          <Image
            src={WORDMARK_SRC}
            alt={appIdentity.name}
            h={WORDMARK_HEIGHT}
            w="auto"
            fit="contain"
          />
        </Link>
      )}
      <div className={classes.middle}>{children}</div>
      {rightSection && <div className={classes.end}>{rightSection}</div>}
    </div>
  );
}
