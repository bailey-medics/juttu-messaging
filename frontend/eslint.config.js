import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import storybook from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Mantine's ActionIcon may not be imported directly, as in Quill Medical:
 * an icon-only button needs a name, which IconButton requires. Quill's other
 * import restrictions come with the components they protect.
 */
const ACTION_ICON = {
  name: "@mantine/core",
  importNames: ["ActionIcon"],
  message:
    "Use IconButton from @/components/button: it requires an aria-label, which an icon-only button needs to be announced as more than 'button'.",
};

/**
 * Nor may Mantine's Loader: a bare ring has no text, so a screen reader user
 * hears nothing while they wait. The bubble spinner says "Loading".
 */
const LOADER = {
  name: "@mantine/core",
  importNames: ["Loader"],
  message:
    "Use BubbleSpinner or PageSpinner from @/components/loading-spinner: a bare Loader has no text, so a screen reader user hears nothing while they wait.",
};

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "storybook-static"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // A floating promise is how a failed request becomes invisible: the
      // rejection goes unhandled and the page carries on as though it worked.
      "@typescript-eslint/no-floating-promises": "error",
      // Type guards, not `as`, for anything that crosses the network.
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "no-restricted-imports": ["error", { paths: [ACTION_ICON, LOADER] }],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // The buttons that show a small ring while they work, with the button's
  // own label saying what is happening, as in Quill Medical.
  {
    files: [
      "src/components/button/ButtonPairRed.tsx",
      "src/components/button/ButtonPair.stories.tsx",
      "src/components/form/Form/SubmitButton.tsx",
    ],
    rules: { "no-restricted-imports": ["error", { paths: [ACTION_ICON] }] },
  },
  // The icon-button wrappers themselves, each of which sets its own name.
  {
    files: [
      "src/components/button/IconButton.tsx",
      "src/components/button/BurgerButton.tsx",
      "src/components/button/SearchButton.tsx",
      "src/components/button/ExtraButton.tsx",
      "src/components/form/FilterSelect.tsx",
      "src/components/ellipsis-menu/EllipsisMenu.tsx",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  ...storybook.configs["flat/recommended"],
);
