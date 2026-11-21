# Quill components port plan

Juttu now wears Quill Medical's colours and its top ribbon, and `AGENTS.md` says every view is built from Juttu's own Storybook components, as Quill's are. But Juttu has almost no components to build from: its two pages, `HomePage` and `NotFoundPage`, still use Mantine's `Title`, `Text` and `Stack` directly, which the new rule forbids. The vision plan's next phases need more: the sign-in page in its Phase 9 needs Quill's form fields and buttons, and the spaces and conversations in its Phases 13 to 15 need cards, states, layouts and navigation.

This plan ports Quill's generic components, with their stories and tests, in the order the pages need them: typography first, then icons and buttons, cards and badges, feedback states, forms, and layout and navigation. Each phase strips out anything about patients, teaching or Quill's own brand, and moves Juttu's pages and existing components onto the new pieces as it goes, so the rule holds by the end. Quill's clinical components stay behind, except its chat components, which come across with their patient parts behind a `clinical` flag.

## Open questions

- [x] **Does Juttu port Quill's chat components now, or design its own for the vision plan's Phase 15?** Quill's `components/messaging/` (`Messaging`, `MessagesList`, `NewMessageModal`, `MessagingTriagePayment`) and `components/inbox/` (`InboxButton`, `RibbonInbox`) draw its conversations and the ribbon's inbox. The vision plan keeps Quill's messaging design but leaves its code behind, because it assumes a patient on every conversation. - Port them as they are, with a `clinical` flag for patient conversations. `Messaging`, `MessagesList`, `NewMessageModal`, `InboxButton` and `RibbonInbox` come across in Phase 7. The patient parts, the patient picker and the "patient as participant" switch in `NewMessageModal`, show only when `clinical` is true, and it is false by default, as a new space is non-clinical in the vision plan. Juttu holds no patient data in its first version, so those parts stay dormant until a clinical space exists. `MessagingTriagePayment`, Quill's billing demonstration, stays behind. Answered in `/t-g`, 21 November 2026.

- [x] **Are tables, search and sort ported in this plan (Phase 7), or when the first page needs them?** Quill's `tables/` (`DataTable` and its parts), `search/` and `sort/` are generic, but no page in the vision plan needs a table before its Phase 12, the members admin screen. - Now, in this plan, as its Phase 8 (Phase 7 is now the chat components), so the catalogue holds them before any page needs them. Answered in `/t-g`, 21 November 2026.

- [x] **What does Juttu's page spinner look like?** Quill's `PageSpinner` turns `QuillSpinner`, an animation of Quill's own quill. Juttu needs its own: Mantine's `Loader` in Quill's colours, or an animation of Juttu's speech bubble, drawn like the icons by `frontend/scripts/make-icons.py`. - An animation of Juttu's speech bubble, as Quill's spinner animates its quill. Phase 4 draws it. Answered in `/t-g`, 21 November 2026.

- [x] **How does `/t-f` land each phase of this plan?** - Ready pull requests, with CI checked after every phase, as the skeleton plan ran. The Decisions section sets out how. Answered in `/t-g`, 21 November 2026.

## Before running /f

- [x] Land the work in the tree with `/t-crpd` before `/t-f` starts: Quill's colours and brand foundations, the top ribbon, the "Building views" rule in `AGENTS.md`, `.claude/rules/pages.md`, and this plan. Phase 1 would otherwise start on top of a large uncommitted change, and `/t-f` stops on a dirty tree. Add `tabler`, the name of Quill's icon set, to the words in `cspell.config.json` as part of it, so the spelling check passes on this plan. Done 21 November 2026, as its own branch on #12.

## Phase 1: Typography

- [x] Port Quill's typography components from `components/typography/` into `frontend/src/components/typography/`, each with its story and test: `PageHeader`, `Heading`, `BodyText`, `BodyTextBold`, `BodyTextInline`, `BodyTextClamp`, `TextLink`, `ExternalTextLink`, `ErrorMessage`, `EmptyState` and `FieldDescription`, and `Divider` from `components/divider/`. Leave out `PublicTitle` and `PublicBodyText`, which belong to Quill's public site, and `MarkdownView`, which needs a Markdown renderer no Juttu page uses yet. `PageHeader` sets the browser tab's title, from `appIdentity.name` in `theme.ts` where Quill uses its own name.

- [x] Move `HomePage`, `NotFoundPage` and the Foundations stories onto them: one `PageHeader` per page, `BodyText` for every paragraph, `TextLink` for the link home. Add a `.claude/rules/components.md`, scoped to `frontend/src/components/**` and ported from Quill's, with only the rules that name components Juttu now has (typography for all text, `PageHeader` once a page, `Heading` for sections) and the language and styling rules. Each later phase adds the rules for the components it brings. Safe to be on `main` on its own: it changes how two pages are drawn, and nothing else.

## Phase 2: Icons, buttons and tooltips

- [x] Add `@tabler/icons-react`, Quill's icon set, and port `components/icons/`: the `Icon` wrapper every icon goes through, `appIcons.tsx` as the one register of icons Juttu uses, and `NavIcon`, `PassIcon` and `FailIcon`. Leave out `PublicNavIcon`. Port `AppTooltip` from `components/tooltip/`.

- [x] Port Quill's buttons from `components/button/`: `ButtonPair`, `ButtonPairRed`, `AddButton`, `IconButton`, `IconTextButton`, `SearchButton`, `ExtraButton`, `BurgerButton`, `PreviousNextButton` and `ActionCardButton`, with their stories and tests. Leave out `PublicButton`. Rebuild `InstallButton` on `IconTextButton`. Port the button half of Quill's `styles/touch-targets.test.tsx` and `styles/disabled-controls.test.tsx`, which hold Juttu's touch-target and disabled-pointer stylesheets to their word; the form half comes in Phase 5. Add the icon and button rules to `.claude/rules/components.md`.

## Phase 3: Cards, badges and status

- [x] Port `BaseCard` and `CardActionRow` from `components/base-card/`, `ActionCard` from `components/action-card/`, and the generic badges from `components/badge/`: `BadgeSkeleton`, `UnreadBadge`, `ActiveStatusBadge` and `FeatureBadge`. Leave out the badges for notes, letters, appointments, competencies, assessments, sign-off, platform roles, feedback and "on Quill", which belong to Quill's clinical and teaching features. Port `StatusStrip` and `LiveStatus`.

- [x] Rebuild `HealthStatus` on the ported badge and `LiveStatus` pieces, if they fit, and give `HomePage` its card. Add the card and badge rules to `.claude/rules/components.md`: every card is a `BaseCard`, and a badge is never cut short.

## Phase 4: Feedback and states

- [x] Port the components that tell somebody what is happening: `ErrorState`, `ErrorBoundary` and `RouteErrorFallback` (wired into the router as its `errorElement`), `ConfirmModal` (leaving out `PasswordConfirmModal` until accounts exist), `OfflineModal`, `UpdatingBanner`, and `ResultMessage` and `StateMessage` from `components/message-cards/`. Build `PageSpinner` on an animation of Juttu's speech bubble, the same shape as its icon in `frontend/scripts/make-icons.py`, drawn as an SVG in the brand navy and mark colours, as Quill's `QuillSpinner` animates its quill. For somebody whose system asks for reduced motion it shows the bubble still, as Quill's does. Use it as the router's fallback while a page loads. Leave out `QuillSpinner`.

## Phase 5: Forms

- [x] Add `react-hook-form`, as Quill's forms use, and port `components/form/`: `Form`, `FormContext`, `FormStatus`, `FormStatusNarrow`, `SubmitButton`, `TextField`, `EmailField`, `PasswordField`, `TextAreaField`, `CheckboxField`, `RadioField`, `SelectField`, `MultiSelectField`, `SolidSwitch`, `FilterSelect` and `FilterModal`, and `DirtyFormNavigation` from `components/warnings/`, which warns before somebody leaves a form unsaved. Leave out `DateField` until a page needs a date, since it brings `@mantine/dates`. Port the form half of Quill's touch-target and disabled-control tests. Bring `components/page-message/` too, whose `PageMessageDisplay` draws with `FormStatus`, and put its slot back in `PageHeader`, as Quill has it. This phase is what the vision plan's sign-in page, its Phase 9, is built from.

## Phase 6: Layout and navigation

- [ ] Port Quill's layouts and navigation without their patient and teaching parts: `MainLayout`, `NoAccessLayout` and `NotFoundLayout` from `components/layouts/`, and `SideNav`, `SideNavContent`, `NestedNavLink` and `SkipLink` from `components/navigation/`, with `NavigationDrawer` from `components/drawers/` and `EllipsisMenu` from `components/ellipsis-menu/`. `SideNavContent` holds Juttu's own entries, which today are only the home page. Leave out `TeachingLayout`, `TeachingMainNav`, `TeachingLearningNav`, `PublicLayout`, `PublicNotFound` and `LogoutNavLink`, which comes with sign-in.

- [ ] Move `RootLayout` onto `MainLayout`, and give `TopRibbon` Quill's burger button and narrow layout back, so the side navigation folds behind the burger on a phone, as in Quill. Add Quill's page rules that now apply to `.claude/rules/pages.md`: right-aligned buttons, and a child navigation link for each new page.

## Phase 7: Chat and inbox

- [ ] Port Quill's chat components as they are, with their stories and tests: `Messaging` and `MessagesList` from `components/messaging/`, which draw a conversation, and `InboxButton` and `RibbonInbox` from `components/inbox/`, which put the inbox in the top ribbon. Wire `RibbonInbox` into `TopRibbon`'s right-hand section beside the install button, showing nothing until there is something to read. Leave out `MessagingTriagePayment`, Quill's billing demonstration.

- [ ] Port `NewMessageModal` with a `clinical` prop, false by default. When it is false, the modal shows no patient picker and no "patient as participant" switch; when it is true, it shows both, as Quill's does. The modal takes its patients and its users as props instead of fetching them from Quill's API, because Juttu has no API for either yet; the page that opens it fetches them. Stories show it both ways, and tests pin that a non-clinical modal never shows a patient field. Juttu holds no patient data in its first version, so the clinical form stays dormant until the vision plan builds clinical spaces.

## Phase 8: Tables, search and sort

- [ ] Port `DataTable`, `DataTableWithResults`, `DataTableControlled`, `DataCard`, `CellContent`, `CellLines`, `SortHeader` and `TablePagination` from `components/tables/`, `SearchFields` from `components/search/`, and `SortChevron` from `components/sort/`, with their stories and tests. Strip any column or cell that names a patient.

## Decisions

- **How `/t-f` runs this plan: ready pull requests, and CI checked after every phase** - answered in `/t-g` on 21 November 2026, as the skeleton plan ran. It overrides two defaults in `/t-f`, for this plan only:

  1. **Finish each phase with `/t-crpd`, not `/t-crpd draft`**, so its pull request is marked ready straight away.
  2. **Then check CI on every pull request in the stack** that carries the workflow, with `gh run list` and `gh run view` for each branch. A check still running is left for the next phase's round.
  3. **If a check has failed, stop the plan and fix it before the next phase.** Read the failing job's log, reproduce it locally and fix the code, not the check. Then run the same check locally and the branch's tests, and confirm both pass.
  4. **Fold the fix into the branch it belongs to**, with `just -g stack-move`, `just -g stack-update`, `just -g stack-rebase` and `just -g stack-submit`, and rewrite that pull request's description if the fix changed what it says. This is authorised for this run only.
  5. **Go back to the top of the stack and carry on** with the next phase.

  The usual two-attempt rule applies. A check that fails because Amazon's image registry refused a pull ("429 Too Many Requests") is re-run once, not fixed. After the last phase, wait for every check to finish, and fix any that fail the same way before reporting the run done.

- **Ported from Quill Medical, with the clinical parts stripped** - Quill's components have already met the accessibility and layout problems a new catalogue meets: badges cut short, touch targets too small on a phone, a modal close button with no name. Each phase ports a component as Quill has it, then removes what assumes a patient, a teaching module or Quill's own brand.

- **Typography first** - the "Building views" rule in `AGENTS.md` forbids raw Mantine text in a page, and both of Juttu's pages break it today. Every later component sets its text through the typography components, so they come before anything else.

- **Each phase moves Juttu onto what it ports** - a component nobody uses is unchecked. So each phase changes the pages, and the components already ported, to use what it brings, and the rule holds by the end of the plan instead of at some later tidy-up.

- **Quill's component rules arrive with their components** - Quill's `.claude/rules/components.md` names components such as `BaseCard`, `PageHeader` and `Icon`. Adding it whole now would point at components Juttu does not have, so each phase adds the rules for the components it ports.

- **Not ported** - `MessagingTriagePayment`, `passport`, `teaching`, `safety`, `patients`, `letters`, `demographics`, `appointments`, `registration`, `member-lookup`, `member-practice`, `admin`, `add-staff-form`, `documents`, `notes`, `profile-pic`, `gender-icon`, `newsletter`, `retention`, `records-kept-card`, `enabled-features-card`, `stats-card`, `feedback`, `media-dropzone`, `multi-step-form`, `images` and Quill's public-site components. Each is clinical, teaching, or about Quill itself. One may come across later when a vision plan phase needs it, as its own step.

## Found while building

- **`PageHeader` came across without Quill's page-message slot** - 21 November 2026, Phase 1. Quill's `PageHeader` shows a page's status messages under the title, through `components/page-message/`, which no phase listed. It was meant for Phase 4, but `PageMessageDisplay` draws its messages with `FormStatus`, a form component, so Phase 5 brings `components/page-message/` and puts the slot back.

- **The icon register started in Phase 1** - Quill's `ErrorMessage` uses `IconAlertCircle` from `components/icons/appIcons.ts`. Phase 1 added `@tabler/icons-react` and an `appIcons.ts` holding that one icon; Phase 2 brings the rest of the register and the `Icon` wrapper.

- **Quill's test helpers and story helpers came across** - `src/test/test-utils.tsx` gives Quill's `renderWithMantine` and `renderWithRouter`, so the ported tests run unchanged, with a `cssClass` helper for Juttu's stricter index checks. `src/stories/variants.tsx` is Quill's, as it was. Vitest now runs with `css: true`, as Quill's does, so a test sees a CSS module's real class names.

- **Every story is found and rendered by itself** - `src/stories.test.tsx` finds every `*.stories.tsx` with `import.meta.glob`, instead of a list kept by hand, and Storybook wraps every story in a memory router, as Quill's does.

- **The home page's title is "Home"** - `PageHeader` sets the browser tab's title too, so a home page titled "Juttu" would read "Juttu - Juttu". The ribbon already shows the name.

- **Phase 2 brought two of Phase 3's helpers early** - Quill's `PassIcon` and `FailIcon` read `components/badge/badgeColours.ts`, and Quill's colour tables live in `styles/semanticColours.ts`, so both came across in Phase 2, unchanged. The icon catalogue story draws its tiles with Mantine's `Paper` until Phase 3 brings `BaseCard`.

- **`AppIconElement` names a Tabler icon element** - Phase 3. Typing `Icon`'s `icon` prop as a Tabler icon, to avoid a cast, meant every component that hands it an icon needs the same type. `components/icons` exports it as `AppIconElement`, which `ActionCard` and `StatusStrip` use.

- **`HealthStatus` announces through `LiveStatus`** - Phase 3. It built its own live region before; it now uses Quill's `LiveStatus`, a hidden status region, and Quill's `success` and `alert` badge colours.

- **The error boundaries came across without reporting or feedback** - Phase 4. Quill's `ErrorBoundary` and `RouteErrorFallback` send each error to Quill's error reporting and offer a "Tell us what happened" feedback form, through `lib/error-reporting` and `lib/feedback`. Juttu has neither, so its boundaries log the error to the console and offer a reload. Both are features for a later plan.

- **Juttu's spinner is three dots pulsing inside its speech bubble** - Phase 4. `BubbleSpinner` draws the icon's bubble as a still SVG, with three small boxes over it that pulse in turn, as a conversation shows somebody typing. Like Quill's quill, only `transform` and `opacity` animate, and only on HTML boxes, and it holds still for anybody who asks for less motion. ESLint now refuses Mantine's `Loader`, as Quill's does.

- **Phase 5 brought `SortChevron` from Phase 8** - Quill's `MultiSelectField` draws its sort chevron, so `components/sort/` came across in Phase 5. Phase 8 ports the rest.

- **The form system keeps two casts, each with its reason** - Phase 5. Juttu's lint refuses every `as`, but React context cannot carry a generic, so `Form` and `useFormContext` restore the caller's field values with one cast each, under a lint-disable comment that says why. Every other cast in the form code became a type guard: the stories' `watch()` values, the tests' error messages, and the flash message `PageMessageContext` reads from router state, which now keeps only a text description.

- **The page-message provider sits in `RootLayout` until Phase 6** - Quill mounts `PageMessageProvider` in `MainLayout`. Juttu mounts it in the same place, around the page inside `RootLayout`, and Phase 6 moves it into `MainLayout`.
