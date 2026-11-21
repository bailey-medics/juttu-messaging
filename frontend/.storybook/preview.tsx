import "@fontsource-variable/atkinson-hyperlegible-next";
import "@mantine/core/styles.css";
import "../src/styles/typography.css";
import "../src/styles/dark-overrides.css";
import "../src/styles/touch-targets.css";
import "../src/styles/disabled-controls.css";

import { MantineProvider } from "@mantine/core";
import type { Decorator, Preview } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";

import { cssVariablesResolver, theme } from "../src/theme";

/** The colour schemes the toolbar offers. */
const COLOUR_SCHEMES = ["light", "dark"] as const;

type ColourScheme = (typeof COLOUR_SCHEMES)[number];

/** Whether a toolbar value is one of the schemes. */
function isColourScheme(value: unknown): value is ColourScheme {
  return COLOUR_SCHEMES.some((scheme) => scheme === value);
}

/**
 * Every story renders inside Juttu's theme, as the app does, in the colour
 * scheme the toolbar names. Dark mode is the brand navy, so each story can
 * be checked in both.
 */
const withMantine: Decorator = (Story, context) => {
  const chosen: unknown = context.globals["colorScheme"];
  const colourScheme: ColourScheme = isColourScheme(chosen) ? chosen : "light";

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme={colourScheme}
    >
      <Story />
    </MantineProvider>
  );
};

/**
 * Every story renders inside a memory router, as in Quill Medical's
 * Storybook, so a component with a link needs nothing of its own. A story
 * opts out with `parameters.disableDefaultRouter`, and sets the address with
 * `parameters.routerPath`.
 */
const withRouter: Decorator = (Story, context) => {
  const parameters: Record<string, unknown> = context.parameters;

  if (parameters["disableDefaultRouter"]) {
    return <Story />;
  }

  const routerPath = parameters["routerPath"];
  const initialPath = typeof routerPath === "string" ? routerPath : "/";
  const router = createMemoryRouter([{ path: "*", element: <Story /> }], {
    initialEntries: [initialPath],
  });

  return <RouterProvider router={router} />;
};

const preview: Preview = {
  // Storybook applies the last decorator outermost: the router sits inside
  // the theme.
  decorators: [withRouter, withMantine],
  globalTypes: {
    colorScheme: {
      description: "Light or dark mode",
      toolbar: {
        title: "Colour scheme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: "light",
  },
  parameters: {
    layout: "padded",
    a11y: {
      // A story with an accessibility failure fails, not merely warns.
      test: "error",
    },
  },
};

export default preview;
