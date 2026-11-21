import "@fontsource-variable/atkinson-hyperlegible-next";
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import type { Decorator, Preview } from "@storybook/react-vite";

import { theme } from "../src/theme";

/** Every story renders inside Juttu's theme, as the app does. */
const withMantine: Decorator = (Story) => (
  <MantineProvider theme={theme} defaultColorScheme="light">
    <Story />
  </MantineProvider>
);

const preview: Preview = {
  decorators: [withMantine],
  parameters: {
    layout: "padded",
    a11y: {
      // A story with an accessibility failure fails, not merely warns.
      test: "error",
    },
  },
};

export default preview;
