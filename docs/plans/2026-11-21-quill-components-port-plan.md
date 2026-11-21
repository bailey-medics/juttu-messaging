# Quill components port plan

Juttu now wears Quill Medical's colours and its top ribbon, and `AGENTS.md` says every view is built from Juttu's own Storybook components, as Quill's are. But Juttu has almost no components to build from: its two pages, `HomePage` and `NotFoundPage`, still use Mantine's `Title`, `Text` and `Stack` directly, which the new rule forbids. The vision plan's next phases need more: the sign-in page in its Phase 9 needs Quill's form fields and buttons, and the spaces and conversations in its Phases 13 to 15 need cards, states, layouts and navigation.

This plan ports Quill's generic components, with their stories and tests, in the order the pages need them: typography first, then icons and buttons, cards and badges, feedback states, forms, and layout and navigation. Each phase strips out anything about patients, teaching or Quill's own brand, and moves Juttu's pages and existing components onto the new pieces as it goes, so the rule holds by the end. Quill's clinical components stay behind, as the vision plan decided for its messaging code.

## Open questions

- [ ] **Does Juttu port Quill's chat components now, or design its own for the vision plan's Phase 15?** Quill's `components/messaging/` (`Messaging`, `MessagesList`, `NewMessageModal`, `MessagingTriagePayment`) and `components/inbox/` (`InboxButton`, `RibbonInbox`) draw its conversations and the ribbon's inbox. The vision plan keeps Quill's messaging design but leaves its code behind, because it assumes a patient on every conversation. Porting the presentational parts now would give Phase 15 a start; designing Juttu's own would keep them free of Quill's assumptions. This plan leaves them out until this is answered.

- [ ] **Are tables, search and sort ported in this plan (Phase 7), or when the first page needs them?** Quill's `tables/` (`DataTable` and its parts), `search/` and `sort/` are generic, but no page in the vision plan needs a table before its Phase 12, the members admin screen. Porting them now keeps the catalogue whole; waiting keeps this plan shorter and ports them against a real page.

- [ ] **What does Juttu's page spinner look like?** Quill's `PageSpinner` turns `QuillSpinner`, an animation of Quill's own quill. Juttu needs its own, or none: Mantine's `Loader` in Quill's colours, or an animation of Juttu's speech bubble, drawn like the icons by `frontend/scripts/make-icons.py`. Phase 4 builds whichever is chosen.

## Before running /f

- [x] Land the work in the tree with `/t-crpd` before `/t-f` starts: Quill's colours and brand foundations, the top ribbon, the "Building views" rule in `AGENTS.md`, `.claude/rules/pages.md`, and this plan. Phase 1 would otherwise start on top of a large uncommitted change, and `/t-f` stops on a dirty tree. Add `tabler`, the name of Quill's icon set, to the words in `cspell.config.json` as part of it, so the spelling check passes on this plan. Done 21 November 2026, as its own branch on #12.

## Phase 1: Typography

- [ ] Port Quill's typography components from `components/typography/` into `frontend/src/components/typography/`, each with its story and test: `PageHeader`, `Heading`, `BodyText`, `BodyTextBold`, `BodyTextInline`, `BodyTextClamp`, `TextLink`, `ExternalTextLink`, `ErrorMessage`, `EmptyState` and `FieldDescription`, and `Divider` from `components/divider/`. Leave out `PublicTitle` and `PublicBodyText`, which belong to Quill's public site, and `MarkdownView`, which needs a Markdown renderer no Juttu page uses yet. `PageHeader` sets the browser tab's title, from `appIdentity.name` in `theme.ts` where Quill uses its own name.

- [ ] Move `HomePage`, `NotFoundPage` and the Foundations stories onto them: one `PageHeader` per page, `BodyText` for every paragraph, `TextLink` for the link home. Add a `.claude/rules/components.md`, scoped to `frontend/src/components/**` and ported from Quill's, with only the rules that name components Juttu now has (typography for all text, `PageHeader` once a page, `Heading` for sections) and the language and styling rules. Each later phase adds the rules for the components it brings. Safe to be on `main` on its own: it changes how two pages are drawn, and nothing else.

## Phase 2: Icons, buttons and tooltips

- [ ] Add `@tabler/icons-react`, Quill's icon set, and port `components/icons/`: the `Icon` wrapper every icon goes through, `appIcons.tsx` as the one register of icons Juttu uses, and `NavIcon`, `PassIcon` and `FailIcon`. Leave out `PublicNavIcon`. Port `AppTooltip` from `components/tooltip/`.

- [ ] Port Quill's buttons from `components/button/`: `ButtonPair`, `ButtonPairRed`, `AddButton`, `IconButton`, `IconTextButton`, `SearchButton`, `ExtraButton`, `BurgerButton`, `PreviousNextButton` and `ActionCardButton`, with their stories and tests. Leave out `PublicButton`. Rebuild `InstallButton` on `IconTextButton`. Port the button half of Quill's `styles/touch-targets.test.tsx` and `styles/disabled-controls.test.tsx`, which hold Juttu's touch-target and disabled-pointer stylesheets to their word; the form half comes in Phase 5. Add the icon and button rules to `.claude/rules/components.md`.

## Phase 3: Cards, badges and status

- [ ] Port `BaseCard` and `CardActionRow` from `components/base-card/`, `ActionCard` from `components/action-card/`, and the generic badges from `components/badge/`: `BadgeSkeleton`, `UnreadBadge`, `ActiveStatusBadge` and `FeatureBadge`. Leave out the badges for notes, letters, appointments, competencies, assessments, sign-off, platform roles, feedback and "on Quill", which belong to Quill's clinical and teaching features. Port `StatusStrip` and `LiveStatus`.

- [ ] Rebuild `HealthStatus` on the ported badge and `LiveStatus` pieces, if they fit, and give `HomePage` its card. Add the card and badge rules to `.claude/rules/components.md`: every card is a `BaseCard`, and a badge is never cut short.

## Phase 4: Feedback and states

- [ ] Port the components that tell somebody what is happening: `ErrorState`, `ErrorBoundary` and `RouteErrorFallback` (wired into the router as its `errorElement`), `ConfirmModal` (leaving out `PasswordConfirmModal` until accounts exist), `OfflineModal`, `UpdatingBanner`, and `ResultMessage` and `StateMessage` from `components/message-cards/`. Build `PageSpinner` as the open question above decides, and use it as the router's fallback while a page loads. Leave out Quill's `QuillSpinner`.

## Phase 5: Forms

- [ ] Add `react-hook-form`, as Quill's forms use, and port `components/form/`: `Form`, `FormContext`, `FormStatus`, `FormStatusNarrow`, `SubmitButton`, `TextField`, `EmailField`, `PasswordField`, `TextAreaField`, `CheckboxField`, `RadioField`, `SelectField`, `MultiSelectField`, `SolidSwitch`, `FilterSelect` and `FilterModal`, and `DirtyFormNavigation` from `components/warnings/`, which warns before somebody leaves a form unsaved. Leave out `DateField` until a page needs a date, since it brings `@mantine/dates`. Port the form half of Quill's touch-target and disabled-control tests. This phase is what the vision plan's sign-in page, its Phase 9, is built from.

## Phase 6: Layout and navigation

- [ ] Port Quill's layouts and navigation without their patient and teaching parts: `MainLayout`, `NoAccessLayout` and `NotFoundLayout` from `components/layouts/`, and `SideNav`, `SideNavContent`, `NestedNavLink` and `SkipLink` from `components/navigation/`, with `NavigationDrawer` from `components/drawers/` and `EllipsisMenu` from `components/ellipsis-menu/`. `SideNavContent` holds Juttu's own entries, which today are only the home page. Leave out `TeachingLayout`, `TeachingMainNav`, `TeachingLearningNav`, `PublicLayout`, `PublicNotFound` and `LogoutNavLink`, which comes with sign-in.

- [ ] Move `RootLayout` onto `MainLayout`, and give `TopRibbon` Quill's burger button and narrow layout back, so the side navigation folds behind the burger on a phone, as in Quill. Add Quill's page rules that now apply to `.claude/rules/pages.md`: right-aligned buttons, and a child navigation link for each new page.

## Phase 7: Tables, search and sort

- [ ] Only if the open question above says now: port `DataTable`, `DataTableWithResults`, `DataTableControlled`, `DataCard`, `CellContent`, `CellLines`, `SortHeader` and `TablePagination` from `components/tables/`, `SearchFields` from `components/search/`, and `SortChevron` from `components/sort/`, with their stories and tests.

## Decisions

- **Ported from Quill Medical, with the clinical parts stripped** - Quill's components have already met the accessibility and layout problems a new catalogue meets: badges cut short, touch targets too small on a phone, a modal close button with no name. Each phase ports a component as Quill has it, then removes what assumes a patient, a teaching module or Quill's own brand.

- **Typography first** - the "Building views" rule in `AGENTS.md` forbids raw Mantine text in a page, and both of Juttu's pages break it today. Every later component sets its text through the typography components, so they come before anything else.

- **Each phase moves Juttu onto what it ports** - a component nobody uses is unchecked. So each phase changes the pages, and the components already ported, to use what it brings, and the rule holds by the end of the plan instead of at some later tidy-up.

- **Quill's component rules arrive with their components** - Quill's `.claude/rules/components.md` names components such as `BaseCard`, `PageHeader` and `Icon`. Adding it whole now would point at components Juttu does not have, so each phase adds the rules for the components it ports.

- **Not ported** - `passport`, `teaching`, `safety`, `patients`, `letters`, `demographics`, `appointments`, `registration`, `member-lookup`, `member-practice`, `admin`, `add-staff-form`, `documents`, `notes`, `profile-pic`, `gender-icon`, `newsletter`, `retention`, `records-kept-card`, `enabled-features-card`, `stats-card`, `feedback`, `media-dropzone`, `multi-step-form`, `images` and Quill's public-site components. Each is clinical, teaching, or about Quill itself. One may come across later when a vision plan phase needs it, as its own step.
