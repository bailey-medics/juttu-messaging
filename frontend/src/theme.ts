/**
 * Juttu's Mantine theme, in Quill Medical's colours.
 *
 * Ported from Quill Medical's `frontend/src/theme.ts`, keeping one brand:
 * Quill's navy and amber, from `brand.json`, with its accessible type
 * scale, status colours and dark mode. Quill's other brands, logos and
 * spinners stay behind.
 *
 * Font sizes are fixed on every screen: screen size does not change how
 * well somebody can read.
 *
 * - xs and sm: 1rem (16px), for captions and metadata
 * - md: 1.1875rem (19px), for body text
 * - lg: 1.5rem (24px), for subheadings
 * - xl: 2rem (32px), for page headings
 */

import {
  createTheme,
  deepMerge,
  NavLink,
  v8CssVariablesResolver,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

import brand from "@/brand.json";
import breakpoints from "@/breakpoints.json";
import navLinkClasses from "@/styles/navLink.module.css";

/** What Juttu calls itself. */
export const appIdentity = {
  name: brand.identity.name,
  shortName: brand.identity.short_name,
} as const;

/** The brand's four colours: primary, secondary, background and mark. */
export const brandColours = brand.brand;

/** A brand's four colours. */
export type BrandColours = typeof brandColours;

/**
 * Mantine needs exactly ten shades per colour. The JSON is a plain list,
 * so check the length here: a ramp one shade short would otherwise shift
 * every shade name by one without any error.
 */
export function toColoursTuple(name: string, shades: string[]): MantineColorsTuple {
  const [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, ...rest] = shades;

  if (
    s0 === undefined ||
    s1 === undefined ||
    s2 === undefined ||
    s3 === undefined ||
    s4 === undefined ||
    s5 === undefined ||
    s6 === undefined ||
    s7 === undefined ||
    s8 === undefined ||
    s9 === undefined ||
    rest.length > 0
  ) {
    throw new Error(
      `brand.json: the ${name} palette needs exactly 10 shades, not ${shades.length}`,
    );
  }

  return [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];
}

/**
 * Navy, 0 lightest to 9 darkest. Shade 5 is the primary shade, for filled
 * buttons; shade 8 is the brand primary.
 */
export const primaryScale = toColoursTuple("primary", brand.palette.primary);

/** Amber, 0 lightest to 9 darkest. Shade 5 is the brand secondary. */
export const secondaryScale = toColoursTuple("secondary", brand.palette.secondary);

/** Mantine's grey, 0 to 7, for surfaces, borders and muted text. */
export const greyScale: readonly string[] = brand.palette.grey;

/**
 * Status colours, as filled backgrounds. Registered as CSS variables, such
 * as `var(--success-color)`.
 *
 * Every fill that takes white text is dark enough for WCAG AA, 4.5:1. The
 * hues stay apart, so colour-blind readers still tell them apart, and each
 * status should still carry an icon or a word. `theme.test.ts` holds them
 * to it.
 */
export const statusColourValues = {
  success: "#087f5b", // Teal: done, passed (Mantine teal.9, 5.0:1)
  warning: "#0b7285", // Cyan: draft, pending (Mantine cyan.9, 5.6:1)
  outstanding: "#d6336c", // Pink: cancelled, failed (Mantine pink.7, 4.6:1)
  info: "#1971c2", // Blue: upcoming, information (Mantine blue.8, 5.0:1)
  neutral: "#ffd43b", // Yellow: default (Mantine yellow.4, takes dark text)
  accent: "#7950f2", // Violet: special states (Mantine violet.6, 5.0:1)
  alert: "#c92a2a", // Red: needs attention (Mantine red.9, 5.5:1)
  // A pale wash, and the only status colour that takes dark text: it says
  // something has not happened yet, or invites the reader to act.
  update: "#e7f5ff", // Very light blue (Mantine blue.0)
} as const;

/**
 * Status colours used as text, with no fill behind them. A fill takes white
 * text, so it must be dark; a word sits on the page, so in dark mode it must
 * be light. Light values pass WCAG AA on white and on `gray.2`; dark values
 * pass on every navy surface.
 */
export const statusTextColourValues = {
  light: {
    success: "#07704f",
    warning: "#0b6b7a",
    outstanding: "#a61e4d", // pink.9
    info: "#1864ab", // blue.9
    accent: "#6741d9", // violet.8
    alert: "#b02525",
  },
  dark: {
    success: "#63e6be", // teal.3
    warning: "#66d9e8", // cyan.3
    outstanding: "#faa2c1", // pink.3
    info: "#74c0fc", // blue.3
    accent: "#b197fc", // violet.3
    alert: "#ff8787", // red.3
  },
} as const;

/** `--success-text-color` and the rest, for one colour scheme. */
function statusTextVariables(
  values: Record<keyof typeof statusTextColourValues.light, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [`--${name}-text-color`, value]),
  );
}

/** Every font size, fixed across all screen widths. 19px body text. */
export const typographyTokens = {
  fontWeights: {
    body: 500,
    bold: 700,
  },
  fontSizes: {
    xs: "1rem", // 16px
    sm: "1rem", // 16px
    md: "1.1875rem", // 19px, body text
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
  },
  headings: {
    h1: { fontSize: "2rem", lineHeight: "1.3" }, // 32px
    h2: { fontSize: "1.75rem", lineHeight: "1.35" }, // 28px
    h3: { fontSize: "1.5rem", lineHeight: "1.4" }, // 24px
    h4: { fontSize: "1.1875rem", lineHeight: "1.5" }, // 19px
    h5: { fontSize: "1rem", lineHeight: "1.55" }, // 16px
    h6: { fontSize: "1rem", lineHeight: "1.55" }, // 16px
  },
} as const;

/**
 * Juttu's own CSS variables, layered on Mantine's.
 *
 * Mantine 9 derives every colour's `-light` variants from solid palette
 * shades, which with this navy made every `variant="light"` surface far
 * heavier than intended. `v8CssVariablesResolver` is Mantine's own opt-in
 * to the Mantine 8 derivation, a translucent wash, so this builds on it.
 */
const appCssVariables = {
  variables: {
    "--brand-primary": brandColours.primary,
    "--brand-secondary": brandColours.secondary,
    "--brand-background": brandColours.background,
    "--brand-mark": brandColours.mark,
    // Navy, not #333, on an amber button: 6.6:1 at rest, 4.6:1 on hover.
    "--button-text-dark": brandColours.primary,
    "--button-active-bg": secondaryScale[6],
    "--button-outline-hover-text": "#d4a854",
    "--burger-hover-bg": "#1e2d4a",
    // Fixed font sizes, applied on :root in styles/typography.css.
    "--typo-xs": typographyTokens.fontSizes.xs,
    "--typo-sm": typographyTokens.fontSizes.sm,
    "--typo-md": typographyTokens.fontSizes.md,
    "--typo-lg": typographyTokens.fontSizes.lg,
    "--typo-xl": typographyTokens.fontSizes.xl,
    // A field's placeholder while the field is in error: part transparent,
    // so an empty field does not read as one somebody filled in wrongly.
    "--error-placeholder-color": "color-mix(in srgb, var(--error-color) 55%, transparent)",
    "--success-color": statusColourValues.success,
    "--warning-color": statusColourValues.warning,
    "--alert-color": statusColourValues.alert,
    "--info-color": statusColourValues.info,
    "--neutral-color": statusColourValues.neutral,
    "--accent-color": statusColourValues.accent,
    "--outstanding-color": statusColourValues.outstanding,
    "--update-color": statusColourValues.update,
    // Text on a status fill that asks for dark: near-black, which reads
    // more strongly than navy on the yellow `neutral` fill.
    "--status-text-dark": "#1a1a1a",
  },
  dark: {
    "--mantine-color-text": "#c9d1d9",
    // Muted text. Mantine's default, dark-2, is repurposed below as a navy
    // surface; primary.1 is at least 6.3:1 on every dark surface.
    "--mantine-color-dimmed": primaryScale[1],
    "--mantine-color-placeholder": "#5c6370",
    // The page is the brand navy, primary 8.
    "--mantine-color-body": primaryScale[8],
    "--ribbon-bg": primaryScale[8],
    "--brand-background": primaryScale[8],
    "--card-bg": primaryScale[7],
    "--card-border": primaryScale[6],
    "--card-border-color": "transparent",
    "--mantine-color-default": primaryScale[6],
    "--mantine-color-dark-6": primaryScale[6],
    "--mantine-color-dark-4": primaryScale[9],
    "--mantine-color-dark-0": "#c9d1d9",
    "--mantine-color-dark-7": primaryScale[6],
    "--mantine-color-dark-2": primaryScale[6],
    "--mantine-color-dark-5": primaryScale[7],
    // An orange-red error colour, readable for colour-blind people: a light
    // coral in dark mode, 5.8:1 on the input navy.
    "--mantine-color-error": "var(--error-color)",
    "--error-color": "#ff8a65",
    "--error-focus-color": "#ffb3b3",
    "--link-color": primaryScale[1],
    "--link-hover-color": primaryScale[0],
    "--mantine-color-anchor": "var(--link-color)",
    // Chat bubbles. Mine is primary.5: body text on primary.4 was just
    // under WCAG AA.
    "--bubble-mine-bg": primaryScale[5],
    "--bubble-theirs-bg": primaryScale[6],
    "--bubble-shadow": "none",
    "--bubble-border-top": `1px solid ${primaryScale[6]}`,
    "--nav-active-colour": "var(--mantine-color-secondary-5)",
    "--nav-hover-bg": "var(--mantine-color-dark-6)",
    "--nav-active-bg": "var(--mantine-color-dark-6)",
    ...statusTextVariables(statusTextColourValues.dark),
  },
  light: {
    "--mantine-color-text": primaryScale[5],
    "--ribbon-bg": brandColours.primary,
    // Muted text. Mantine's gray.6 is 3.3:1 on white; gray.7 is 8.2:1.
    "--mantine-color-dimmed": greyScale[7],
    "--mantine-color-placeholder": "var(--mantine-color-gray-4)",
    // The same orange-red, darkened: 5.5:1 on white, 4.7:1 on gray.2.
    "--mantine-color-error": "var(--error-color)",
    "--error-color": "#c4320a",
    "--error-focus-color": "#ffb3b3",
    // Links: primary.4, 6.9:1 on white, darkening to the brand navy.
    "--link-color": primaryScale[4],
    "--link-hover-color": primaryScale[8],
    "--mantine-color-anchor": "var(--link-color)",
    "--bubble-mine-bg": primaryScale[0],
    "--bubble-theirs-bg": secondaryScale[1],
    "--bubble-shadow": "0 1px 0 rgba(0,0,0,0.06)",
    "--bubble-border-top": "1px solid rgba(0,0,0,0.06)",
    // The current nav link: amber darkened to secondary.7, 5.5:1 on white.
    "--nav-active-colour": "var(--mantine-color-secondary-7)",
    "--nav-hover-bg": "var(--mantine-color-gray-0)",
    "--nav-active-bg": "var(--mantine-color-gray-1)",
    ...statusTextVariables(statusTextColourValues.light),
  },
};

export const theme = createTheme({
  /** Atkinson Hyperlegible Next, from the Braille Institute. */
  fontFamily: "'Atkinson Hyperlegible Next Variable', sans-serif",
  fontFamilyMonospace:
    "'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",

  /** Text is the primary navy, shade 5, not pure black. */
  black: primaryScale[5],

  colors: {
    primary: primaryScale,
    secondary: secondaryScale,
  },
  primaryColor: "primary",
  primaryShade: 5,

  other: {
    colours: brandColours,
  },

  /**
   * The focus ring for keyboard focus only, set so it is a decision, and no
   * animation for anybody whose system asks for reduced motion. Mantine
   * defaults `respectReducedMotion` to false.
   */
  focusRing: "auto",
  respectReducedMotion: true,

  /** Sizes for xs to xl come from styles/typography.css. */
  fontSizes: typographyTokens.fontSizes,

  headings: {
    sizes: typographyTokens.headings,
  },

  /** From breakpoints.json, which PostCSS reads too. */
  breakpoints,

  components: {
    /** The current nav link: an amber label and icon on a mild grey fill. */
    NavLink: NavLink.extend({
      // A button unless a caller says otherwise: an <a> with no href cannot
      // be reached from the keyboard. Links pass `component={Link}`.
      defaultProps: { component: "button" },
      classNames: navLinkClasses,
      vars: () => ({
        root: {
          "--nl-color": "var(--nav-active-colour)",
          "--nl-bg": "var(--nav-active-bg)",
          "--nl-hover": "var(--nav-active-bg)",
        },
        children: {},
      }),
    }),
    // Mantine's modal close button has no accessible name. "Close dialog",
    // not "Close", so it differs from a text button named "Close".
    Modal: {
      defaultProps: {
        closeButtonProps: { "aria-label": "Close dialog" },
      },
    },
    Badge: {
      defaultProps: {
        size: "lg",
      },
      // A badge is never cut short: it is exactly as wide as its text, on
      // one line. When a row runs out of room, the layout gives way.
      styles: {
        root: {
          minWidth: "max-content",
          flexShrink: 0,
          overflow: "visible",
        },
        label: {
          fontSize: "1.1875rem", // 19px, the GOV.UK minimum
          whiteSpace: "nowrap",
          overflow: "visible",
          textOverflow: "clip",
        },
      },
    },
  },
});

/** Juttu's CSS variables, layered on Mantine's in its Mantine 8 form. */
export const cssVariablesResolver: CSSVariablesResolver = (mantineTheme) =>
  deepMerge(v8CssVariablesResolver(mantineTheme), appCssVariables);
