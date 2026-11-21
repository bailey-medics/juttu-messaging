/**
 * Juttu's Mantine theme.
 *
 * Ported from Quill Medical's theme, keeping its accessible type scale and
 * leaving its brands behind. Body text is 19px on every screen: screen size
 * does not change how well somebody can read.
 *
 * - xs and sm: 1rem (16px), for captions and metadata
 * - md: 1.1875rem (19px), for body text
 * - lg: 1.5rem (24px), for subheadings
 * - xl: 2rem (32px), for page headings
 */

import { createTheme, type MantineColorsTuple } from "@mantine/core";

import breakpoints from "./breakpoints.json";

/** Juttu's primary colour, a deep teal. Shade 6 is the one buttons use. */
export const primaryScale: MantineColorsTuple = [
  "#e6fbf8",
  "#d5f2ee",
  "#ade3dc",
  "#81d4c9",
  "#5dc7b9",
  "#46bfaf",
  "#36a596",
  "#268e81",
  "#147f72",
  "#006d61",
];

export const theme = createTheme({
  primaryColor: "primary",
  primaryShade: { light: 8, dark: 6 },
  colors: { primary: primaryScale },
  breakpoints,
  fontFamily: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif",
  headings: {
    fontFamily: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif",
  },
  fontSizes: {
    xs: "1rem",
    sm: "1rem",
    md: "1.1875rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  defaultRadius: "md",
});
