---
paths:
  - "frontend/src/components/**"
---

# Component conventions

Ported from Quill Medical's. Each phase of the Quill components plan
(`docs/plans/2026-11-21-quill-components-port-plan.md`) adds the rules for
the components it brings, such as cards, icons, buttons and the spinner.

- **Reuse existing components** from `frontend/src/components/`. Always
  check what already exists before creating anything new.
- **Use the typography components from `components/typography/` for all
  text.** Never use Mantine's `<Text>` or `<Title>`, or plain HTML text
  elements, directly. If none of them fits, ask a person before creating a
  new one. The one exception is `TopRibbon`'s name, which stands in for a
  wordmark image Juttu does not have yet.
- **`<PageHeader>` is for the page title, and only for that**: every page
  has exactly one, and it is the page's only `h1` and its browser-tab
  title. Section headings within a page use **`<Heading>`**, always an
  `h2`.
- **Wrap every Tabler icon in `<Icon>`**, from `components/icons/Icon.tsx`:
  `<Icon icon={<IconPencil />} />`, never `<IconPencil />` on its own.
  Import icons only from `components/icons/appIcons.ts`, and register a
  new icon there first, in the re-export and in `iconCatalogue`.
- **An icon-only button is `IconButton`**, which needs an accessible name
  (`aria-label`) to compile.
- **Every card is a `<BaseCard>`**, from `components/base-card/BaseCard.tsx`,
  never Mantine's `<Card>` directly. `BaseCard` fixes the shadow, padding,
  radius and border, and they cannot be overridden.
- **A badge is never cut short.** The theme keeps every badge exactly as
  wide as its text, on one line; when a row runs out of room, the layout
  around it gives way. Badge colours come from
  `components/badge/badgeColours.ts`.
- **Every form is a `<Form>`**, from `components/form/Form/`, with Juttu's
  field components (`TextField`, `PasswordField`, `SelectField` and the
  rest) and its `SubmitButton`. `Form` carries the saving, saved and
  failed states, and `FormStatus` reports them. Never use Mantine's inputs
  directly.
- **Never use `clearable` on a `SelectField`.** If a field is optional, say
  so in its placeholder.
- **Every new component has a `.stories.tsx` and a `.test.tsx` beside
  it.** `src/stories.test.tsx` finds and renders every story by itself.

## Language and text

- **British English** for all UI text, comments, and our own identifiers,
  such as `colour` and not `color` in our own props. Exceptions: external
  APIs, libraries, CSS properties and HTTP headers.
- **No em dashes or en dashes** in UI text, comments or stories. Use a
  comma, colon, full stop or brackets, or a spaced hyphen ( - ).
- **Sentence case** for all UI labels, buttons and headings: "Add new
  user", not "Add New User". Product names, acronyms and proper nouns keep
  their casing.

## Styling

- **No inline styles** in a component: use Mantine component props or CSS
  modules only.
- **Use `rem`, not `px`,** in CSS modules for sizes: padding, margins,
  widths and font sizes. Breakpoints use `em`, through the theme.
- **Responsive**: use `theme.breakpoints.sm` (`40em`, 640px) for the
  phone and desktop split, through `useMediaQuery`.
- **Button layout**:
  - Use `ButtonPair` or `ButtonPairRed` for a pair of actions (submit and
    cancel, confirm and dismiss). They sit right-aligned on a desktop and
    stack full width on a phone.
  - Wrap a button on its own in `<Group justify="flex-end">`, so it sits
    on the right.
  - A page's header action, such as an `AddButton`, goes in
    `PageHeader`'s `action` prop, never in a hand-built
    `<Group justify="space-between">`. Pass `actionAlign="center"` for
    something shorter than the title, such as a badge.
- **A disabled control keeps the ordinary pointer.** Never give one
  `cursor: not-allowed`. `src/styles/disabled-controls.css` overrides
  Mantine's default for every Mantine control. Something in progress is
  better shown with a button's `loading` state than by disabling it.

## Colours

- **Every colour comes from the design system** in `src/theme.ts` and
  `src/brand.json`. Never a hard-coded value such as `black`, `#333` or
  `rgb(...)` in a component or a CSS module.
- **Never use Mantine's own colour names or scales**, such as `"red"`,
  `"teal"`, `dark.4` or `--mantine-color-blue-6`. Use Juttu's tokens:
  `primary`, `secondary`, `gray`, and the status colours as CSS variables,
  such as `var(--success-color)` and `var(--alert-color)`.
- **In TSX**, import `brandColours`, `primaryScale`, `secondaryScale` or
  `greyScale` from `@/theme`, or use tokens such as `c="primary.7"`.
- **In CSS modules**, use the CSS variables, such as
  `var(--mantine-color-text)` and `var(--brand-secondary)`.
- **Dark mode borders**: every form field's input uses
  `var(--mantine-color-primary-9)` for its border in dark mode, through
  `[data-mantine-color-scheme="dark"]` selectors in its CSS module. An
  error uses `var(--error-color)`, and `var(--error-focus-color)` on focus.

## Accessibility

- **Every story must pass Storybook's accessibility checks**, in light
  and in dark mode; `a11y.test` is set to `error` in `.storybook/preview.tsx`.
- **A rule override on one story needs a comment saying why**, on that
  story's `parameters.a11y`, never in `.storybook/preview.tsx`.
- **A wait is `BubbleSpinner` or `PageSpinner`**, from
  `components/loading-spinner/`: `PageSpinner` where the wait stands in
  for the whole page, `BubbleSpinner` for part of a page already showing.
  Both say "Loading" to a screen reader. Importing Mantine's `Loader`
  directly fails lint, because a bare ring has no text.
- **A page that throws shows `ErrorState`, never a white screen.**
  `RootLayout` wraps every page in `ErrorBoundary`, and the router shows
  `RouteErrorFallback` for a route that fails before it renders.
- **Anything clickable is a button or a link.** A click handler on a `div`
  cannot be reached from the keyboard.
- **Text colours come from the tokens in `theme.ts`**, which
  `theme.test.ts` holds to 4.5:1. Greys 4 to 6 are for icons and borders,
  never for text; muted text is `c="dimmed"`.

## Testing and stories

- **Use `renderWithMantine` or `renderWithRouter`** from
  `@/test/test-utils` in component tests, and `cssClass` from the same
  file to name a class from a CSS module.
- **Use `VariantStack` and `VariantRow`** from `src/stories/variants.tsx`
  for "all sizes" or "all variants" stories.
- **Use `StoryNote`** from `src/stories/variants.tsx` for all descriptive
  text in stories, underneath the component it labels.
- **Longer prose goes in an `.mdx` guide**, beside the stories, with
  `<Meta title="<the stories' title>/Guide" />`, as `FieldDescription.mdx`
  does. Never use `parameters.docs.description`, which renders nowhere.
- **Every story renders inside a memory router.** A story opts out with
  `parameters.disableDefaultRouter`, and sets the address with
  `parameters.routerPath`.
