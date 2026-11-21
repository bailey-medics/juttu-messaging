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
      "no-restricted-imports": ["error", { paths: [ACTION_ICON] }],
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
  // The icon-button wrappers themselves, each of which sets its own name.
  {
    files: [
      "src/components/button/IconButton.tsx",
      "src/components/button/BurgerButton.tsx",
      "src/components/button/SearchButton.tsx",
      "src/components/button/ExtraButton.tsx",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  ...storybook.configs["flat/recommended"],
);
