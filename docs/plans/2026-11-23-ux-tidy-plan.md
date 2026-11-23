# UX tidy plan

Juttu's pages still show scaffolding from the skeleton. Home opens with
a tagline, a "Backend up" card and the notifications card, above a table
of conversations. The ribbon carries an "Install Juttu" button, and the
admin pages sit loose in the side navigation. Mark asked for ten changes
on 23 November 2026. They make Home a list of conversations and nothing
else. Settings get a page of their own. Admin gets one heading in the
navigation, as Quill Medical has. The ribbon's name becomes a proper
wordmark.

The outcome: Home is titled "Conversations" and lists each conversation
as Quill lists patient conversations, a round icon with initials beside
the name, its newest message and when it was sent. Notifications and
installing Juttu live on a new Settings page, as Quill's do. An "Admin"
heading holds Members and Senders, each with its own icon. The ribbon
shows "Juttu" in Finlandica Headline, 40% bigger than now, drawn as
Turva's wordmark is.

## Open questions

- [ ] **Whose initials does a channel's round icon show?** A direct
      conversation shows the other people, as Quill does. A channel can
      have many members. Recommended: one circle with the channel's own
      initials, so a busy channel is not a crowd of faces. The other
      choice is the stacked icons of its most recent posters.
- [ ] **Where does a conversation's space show in the new list?** The
      table had a "Space" column, and the list's card has a name, a
      preview and a time. Recommended: after the name, as
      "general · Turva". The other choices are a second line, or leaving
      the space out.
- [ ] **What does the list show when the newest thing in a channel is a
      living card?** Recommended: the card's title and current line, such
      as "Run 4512: Passed", with whichever is newer of the newest message
      and the newest card change.
- [ ] **Does the navigation entry "Home" stay "Home"**, now the page is
      titled "Conversations"? Recommended: rename it "Conversations", so
      the link and the page say the same thing, with the same house icon.
- [ ] **Does Members move under Admin as well as Senders?** Members is
      admin-only too. Recommended: yes, both sit under Admin.
- [ ] **What does the Admin page itself show?** Quill's Admin page shows
      counts. Recommended: one action card for each section, Members and
      Senders, saying what it is for and linking to it.
- [ ] **Which icon does Senders get?** Recommended: Tabler's "webhook",
      since a sender is an outside tool posting events. The other choices
      are "plug-connected" or "send".
- [ ] **What happens to the "Backend up" check?** Recommended: remove
      the `HealthStatus` component with the card, since nothing else uses
      it. The `/api/health` endpoint stays, because Docker and the local
      deploy use it. The other choice is to move the check to the Admin
      page.
- [ ] **What does the Settings install card do on an iPhone?** Safari
      never offers an install prompt. Recommended: as Quill does, the card
      shows until Juttu is installed. Its button opens the browser's
      prompt where there is one, and otherwise a modal with the share
      menu steps from `docs/dev-box.md`.
- [ ] **Is the wordmark an SVG, as Turva's is, or live text in the
      font?** Recommended: an SVG, each letter a path, so no font loads
      and it looks the same everywhere. Juttu, like Turva, is a Finnish
      word.

## Phase 1: a Settings page, with notifications and installing

- [ ] **Add a Settings page at `/settings`**,
      `frontend/src/pages/SettingsPage.tsx`, for anybody signed in, laid
      out as Quill's `frontend/src/pages/Settings.tsx`: a `PageHeader`
      titled "Settings" over a `SimpleGrid` of cards, two columns on a
      wide screen and one on a phone. Add it to `routes.tsx`, and add
      "Settings" to `NAV_ITEMS` in
      `frontend/src/components/navigation/navItems.ts` with the
      "settings" icon, after Spaces, as Quill places it.

- [ ] **Move the notifications card from Home to Settings.** The state
      and handlers in `HomePage.tsx` for push and the notify level move
      with it: `pushState`, `enablePush`, `getNotifyLevel` and
      `setNotifyLevel`. `NotificationsCard` itself does not change. Home
      keeps the card until this phase lands, so notifications are never
      without a home.

- [ ] **Add an "Install app" card to Settings, and take the install
      button out of the ribbon**, item 6. Port Quill's card: an
      `ActionCard` (Juttu already has `components/action-card`) with the
      download icon, the title "Install Juttu" and the line "Open Juttu
      full screen from its own icon, and get notifications". It shows
      until Juttu is installed, which `display-mode: standalone` tells.
      Its button calls `install()` from `useInstallPrompt` where the
      browser has offered a prompt. Otherwise it opens a modal with the
      steps for Safari's share menu, ported from Quill's
      `components/install-app-modal`. In `RootLayout.tsx` the ribbon then
      has no right section: `RibbonInbox` was only shown beside the
      install button, and it draws nothing until it has a count. Remove
      `InstallButton`, its stories and tests, once nothing uses it.

- [ ] **Tests and stories:** `SettingsPage.test.tsx` covers both cards,
      the install card hidden once installed, the prompt used when there
      is one and the modal when there is not. Update the `RootLayout` and
      `TopRibbon` tests that expected the install button. Add stories for
      the page and the install card.

- [x] **Add this plan's new words to `cspell.config.json`**, in
      alphabetical order: "Finlandica", "HarfBuzz" and "scratchpad". The
      spelling check ignores case, so "Finlandica" covers "finlandica".
      Done on 23 November 2026, with the unread cards fix, so the plan
      could be committed with it.

## Phase 2: Home is just "Conversations"

- [ ] **Tidy `frontend/src/pages/HomePage.tsx`**, items 1, 7, 8 and 9: - Remove the "Backend up" card, and with it the `checkHealth`
      effect. Remove `HealthStatus` and its stories and tests if
      nothing else uses it (see Open questions). - Remove the line "A quiet place for a team, its pipeline and its
      agents to talk." - Title the page "Conversations". - Remove the `Heading` "Your conversations". - Rename the navigation entry to match, if agreed (see Open
      questions).
      The table stays for this phase, so this pull request is only
      removals.

- [ ] **Tests and stories:** update `HomePage.test.tsx` and
      `HomePage.stories.tsx` for the new title, and for the card and
      heading being gone.

## Phase 3: the conversation list, as Quill shows patient conversations

- [ ] **Send what the list needs from `GET /api/conversations`**,
      `home_conversation_body` in `backend/app/conversations/views.py`.
      Add `last_item`, the newest message or card change, or `null` for a
      conversation with neither: its text (a message's body, or a card's
      title and line) and its time. Add `people`, for the round icons: in
      a direct conversation, each other person's id and display name, and
      in a channel, the channel's name (see Open questions). Fetch the
      newest message with a `Subquery` in `all_conversations_for`, as
      `last_active_at` is fetched now, so the list stays one query however
      many conversations there are. Prove that with
      `django_assert_num_queries`. A message that was corrected shows its
      newest correction, as the conversation does. Add the fields to
      `HomeConversation` and `isHomeConversation` in
      `frontend/src/api/conversations.ts`.

- [ ] **Show the list with Juttu's `MessagesList`**,
      `frontend/src/components/messaging/MessagesList.tsx`, already
      ported from Quill and not yet used. It draws a `ProfilePic` with
      initials for one person and `StackedProfilePics` for several, the
      unread badge, the preview clamped to two lines and the relative
      time. In `HomePage.tsx` map each `HomeConversation` to a
      `MessageThread`, with the space beside the name (see Open
      questions). Give each person a gradient from their id, so the same
      person keeps the same colour everywhere. A click opens the
      conversation as the table row did, and the live reload stays. Its
      loading cards replace the table's, and the empty and error states
      keep their wording.

- [ ] **Tests and stories:** backend tests for `last_item` (a message, a
      card change, a correction, none) and `people` in both kinds.
      `HomePage.test.tsx` covers the rows, a click, unread counts, the
      empty list and an error. Update `HomePage.stories.tsx` and the
      demo data so the stories show initials and previews.

## Phase 4: an Admin heading, with Members and Senders beneath it

- [ ] **Add "Admin" to the navigation, as Quill has it**, items 3 and 4,
      in `navItems.ts`: label "Admin", `href` "/admin", icon
      "adjustments" (Quill's, `IconAdjustmentsHorizontal`, already in
      `appIcons.ts`), `keepsDrawerOpen: true`, as Quill sets it so a
      phone's drawer stays open to show what is under it. Its children:
      Members with the "user" icon and Senders with a new icon (see Open
      questions), each keeping its own child link ("Add member",
      "Register sender"). `ADMIN_NAV_ITEMS` becomes this one entry.
      `NestedNavLink` already nests with icons, and opens Admin while any
      page under it is open.

- [ ] **Add the new icon to `NavIcon`**,
      `frontend/src/components/icons/NavIcon.tsx`: a new `IconName`, the
      Tabler icon in `appIcons.ts` and `iconCatalogue`, and its story.

- [ ] **Add an Admin page at `/admin`**, under `RequireAdmin`,
      `frontend/src/pages/AdminPage.tsx`: a `PageHeader` "Admin" over one
      `ActionCard` for each section (see Open questions). "Members: who
      can sign in, and what they may do" leads to `/members`. "Senders:
      outside tools that keep cards up to date in a channel" leads to
      `/senders`. The pages keep their addresses (see Decisions).

- [ ] **Tests and stories:** navigation tests for Admin and its children
      shown to an admin only, and opened on `/members/new` and `/senders`.
      An Admin page test for both cards and "No access" for a member.
      Stories for the page and the navigation with Admin open.

## Phase 5: the Juttu wordmark in Finlandica Headline

- [ ] **Draw the wordmark**, `frontend/public/wordmark-white.svg`, item
      5: "Juttu" in Finlandica Headline at weight 700, white, each
      letter's outline a path so the file needs no font. Make it as
      Turva's was, in `turva-port-quill`'s
      `docs/docs/plans/2026-11-06-storybook-brand-switch-plan.md`, Phase 8. Shape it with HarfBuzz so the font's kerning applies, and outline
      it with fontTools, in a throwaway environment in the scratchpad. The
      file is artwork, made once, so no script is kept. The font is
      Fontsource's `finlandica-headline` 5.3.0, `latin-700-normal`, under
      the SIL Open Font Licence. Finlandica was made for Finland's
      country brand, and Juttu is a Finnish word. Fit the box from the cap
      height to a little below the baseline, as Turva's is.

- [ ] **Show it in the ribbon at 40% bigger than the name is now**,
      `frontend/src/components/ribbon/TopRibbon.tsx`. The name is now
      text at Mantine's `lg` size, 18 pixels. Size the image so its
      capital J stands 1.4 times as tall as the text's does now, measured
      in Storybook before and after. Give it the alt text "Juttu", inside
      the same link home. Check the ribbon still fits its 60 pixels, and
      that the burger still replaces the name on a narrow screen. Update
      the comment that says Juttu's name is set in text until it has a
      wordmark.

- [ ] **Tests and stories:** `TopRibbon.test.tsx` finds the link home by
      the image's alt text. Update the ribbon stories.

## Decisions

- **Members and Senders keep their addresses**, `/members` and
  `/senders`, rather than moving under `/admin/`. The navigation nests
  them by its children, not by their address, so nothing needs to move.
  Bookmarks and `docs/dev-box.md` stay right.
- **Settings comes before the Home tidy**, so the notifications card
  always has a page. Removing it from Home first would leave a phone
  with no way to turn notifications on.
- **The Home tidy lands apart from the new list.** Phase 2 only removes
  things, and Phase 3 holds the backend change and the new layout, so
  each pull request reads as one idea.
