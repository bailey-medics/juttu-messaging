# UX tidy plan

Juttu's pages still show scaffolding from the skeleton. Home opens with
a tagline, a "Backend up" card and the notifications card, above a table
of conversations. The ribbon carries an "Install Juttu" button, and the
admin pages sit loose in the side navigation. Mark asked for ten changes
on 23 November 2026, and `/t-g` grew them the same day. Home becomes a
list of conversations and nothing else. Settings get a page of their
own. Senders moves under an "Admin" heading, as Quill Medical's admin
pages sit. The ribbon's name becomes a proper wordmark.

The outcome: Home is titled "Conversations" and lists each conversation
as Quill lists patient conversations, grouped by space. Each row has
round icons with people's initials, or the channel's own icon, then its
newest message and when it was sent. Each space has a kind, Dev,
Personal or Clinical, which sets its place on Home until a person
orders their spaces in Settings. Notifications and installing Juttu live
on the Settings page. Quill's connection status replaces the "Backend
up" card. The ribbon shows "Juttu" in Finlandica Headline, 40% bigger
than now, drawn as Turva's wordmark is.

## Open questions

- [x] **Whose initials does a channel's round icon show?** A direct
      conversation shows the other people, as Quill does. A channel can
      have many members. Recommended: one circle with the channel's own
      initials, so a busy channel is not a crowd of faces. The other
      choice is the stacked icons of its most recent posters. Answer: a
      channel with only a few people shows their circles, and a bigger
      one shows a channel icon instead. Each channel also gets a setting,
      changed from an ellipsis menu inside the channel, to stop showing
      people's circles. Mark: "We will hone how this works". Answered in
      `/t-g`, 23 November 2026. The exact number and the icon are settled
      in the follow-up questions below.
- [x] **Where does a conversation's space show in the new list?** The
      table had a "Space" column, and the list's card has a name, a
      preview and a time. Recommended: after the name, as
      "general · Turva". The other choices are a second line, or leaving
      the space out. Answer: Home groups the list into a subsection for
      each space, such as Dev, then Personal, then Clinical. The order of
      the spaces can be changed in Settings. Answered in `/t-g`, 23
      November 2026. Who sets the order, and the order before anybody
      sets it, are settled in the follow-up questions below.
- [x] **What does the list show when the newest thing in a channel is a
      living card?** Recommended: the card's title and current line, such
      as "Run 4512: Passed", with whichever is newer of the newest message
      and the newest card change. Answer: as recommended. Answered in
      `/t-g`, 23 November 2026.
- [x] **Does the navigation entry "Home" stay "Home"**, now the page is
      titled "Conversations"? Recommended: rename it "Conversations", so
      the link and the page say the same thing, with the same house icon.
      Answer: keep "Home". The link says Home, and the page it opens is
      titled Conversations. Answered in `/t-g`, 23 November 2026.
- [x] **How many people may a channel have and still show their
      circles?** Answer: up to 4 people besides the person looking. With
      5 or more besides them, Home shows the channel's icon. Answered in
      `/t-g`, 23 November 2026.
- [x] **What is a channel's icon, when it does not show circles?**
      Answer: an icon picked at random for the channel, or an image
      uploaded for it, if one was given. Answered in `/t-g`, 23 November 2026. What "at random" draws from, and how uploading works, are
      settled in the follow-up questions below.
- [x] **Who may turn off a channel's circles?** It changes what
      everybody sees for that channel. Answer: organisation admins only,
      as they manage spaces and senders today. Answered in `/t-g`, 23
      November 2026.
- [x] **Is the order of spaces on Home each person's own, or one order
      for everybody?** Answer: each person's own. It changes only their
      Home. Answered in `/t-g`, 23 November 2026.
- [x] **What is a channel's random icon?** Answer: one of a short list
      of friendly Tabler icons, on a colour, both picked at random when
      the channel is made and then kept, so the channel always looks the
      same. Answered in `/t-g`, 23 November 2026.
- [x] **When is uploading a channel's own icon built?** Answer: in this
      plan, from the ellipsis menu inside the channel. Answered in `/t-g`,
      23 November 2026.
- [x] **Which order does Home show spaces in, before somebody sets
      their own?** Answer: Dev, then Personal, then Clinical. Answered in
      `/t-g`, 23 November 2026.
- [x] **What are Dev, Personal and Clinical?** Answer: a kind that each
      space has, chosen when it is made. Clinical means the same as
      today's clinical flag. Home groups by kind in that order, then A to
      Z within each kind. Answered in `/t-g`, 23 November 2026.
- [x] **How does somebody change the order of their spaces in
      Settings?** Answer: a list of their spaces, each with "Move up" and
      "Move down" buttons, which work with a keyboard, a screen reader and
      a phone. Answered in `/t-g`, 23 November 2026.
- [x] **Where are uploaded channel icons kept?** Answer: in the
      database, so nothing new is set up on the box copy and they are
      backed up with everything else. Answered in `/t-g`, 23 November 2026.
- [x] **What may be uploaded as a channel icon?** Answer: a PNG, JPEG
      or WebP image of up to 1 MB. Juttu checks it really is one, and
      shrinks it to a 256 pixel square with Pillow, a new dependency.
      Answered in `/t-g`, 23 November 2026.
- [x] **Who may upload or remove a channel's icon?** Answer:
      organisation admins, the same people who may turn a channel's
      circles off. Answered in `/t-g`, 23 November 2026.
- [x] **Which kind does an existing space get?** Answer: a clinical
      space becomes Clinical, and every other existing space becomes Dev.
      Today's clinical flag stays as it is. Answered in `/t-g`, 23
      November 2026.
- [x] **Does Members move under Admin as well as Senders?** Members is
      admin-only too. Recommended: yes, both sit under Admin. Answer: only
      Senders moves. Members stays at the top level. Answered in `/t-g`,
      23 November 2026.
- [x] **What does the Admin page itself show?** Quill's Admin page shows
      counts. Recommended: one action card for each section, Members and
      Senders, saying what it is for and linking to it. Answer: a
      placeholder for now. Answered in `/t-g`, 23 November 2026.
- [x] **Which icon does Senders get?** Recommended: Tabler's "webhook",
      since a sender is an outside tool posting events. The other choices
      are "plug-connected" or "send". Answer: "webhook", as recommended.
      Answered in `/t-g`, 23 November 2026.
- [x] **What happens to the "Backend up" check?** Recommended: remove
      the `HealthStatus` component with the card, since nothing else uses
      it. The `/api/health` endpoint stays, because Docker and the local
      deploy use it. The other choice is to move the check to the Admin
      page. Answer: the card goes, and Quill's connection status takes its
      place, which Juttu does not have yet. Quill's `ConnectivityContext`
      polls `/api/health` while the backend is out of reach, and drives
      the offline and reconnected strips and the offline modal. Mark: "I
      want what we built in quill". `HealthStatus` is then deleted.
      Answered in `/t-g`, 23 November 2026.
- [x] **What does the Settings install card do on an iPhone?** Safari
      never offers an install prompt. Recommended: as Quill does, the card
      shows until Juttu is installed. Its button opens the browser's
      prompt where there is one, and otherwise a modal with the share
      menu steps from `docs/dev-box.md`. Answer: as recommended. Answered
      in `/t-g`, 23 November 2026.
- [x] **Is the wordmark an SVG, as Turva's is, or live text in the
      font?** Recommended: an SVG, each letter a path, so no font loads
      and it looks the same everywhere. Juttu, like Turva, is a Finnish
      word. Answer: an SVG, as recommended. Answered in `/t-g`, 23
      November 2026.
- [x] **Can a space's kind change after it is made?** Settled from the
      code: no. There is no way to edit a space once it is made, and the
      clinical flag is set the same way, once. A later plan can add
      editing.

## Phase 1: a Settings page, with notifications and installing

- [x] **Add a Settings page at `/settings`**,
      `frontend/src/pages/SettingsPage.tsx`, for anybody signed in, laid
      out as Quill's `frontend/src/pages/Settings.tsx`: a `PageHeader`
      titled "Settings" over a `SimpleGrid` of cards, two columns on a
      wide screen and one on a phone. Add it to `routes.tsx`, and add
      "Settings" to `NAV_ITEMS` in
      `frontend/src/components/navigation/navItems.ts` with the
      "settings" icon, after Spaces, as Quill places it.

- [x] **Move the notifications card from Home to Settings.** The state
      and handlers in `HomePage.tsx` for push and the notify level move
      with it: `pushState`, `enablePush`, `getNotifyLevel` and
      `setNotifyLevel`. `NotificationsCard` itself does not change.

- [x] **Add an "Install Juttu" card to Settings, and take the install
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

- [x] **Tests and stories:** `SettingsPage.test.tsx` covers both cards,
      the install card hidden once installed, the prompt used when there
      is one and the modal when there is not. Update the `RootLayout` and
      `TopRibbon` tests that expected the install button. Add stories for
      the page and the install card.

- [x] **Add this plan's new words to `cspell.config.json`**, in
      alphabetical order: "Finlandica", "HarfBuzz" and "scratchpad". The
      spelling check ignores case, so "Finlandica" covers "finlandica".
      Done on 23 November 2026, with the unread cards fix, so the plan
      could be committed with it.

Found while building, 23 November 2026:

- **Quill's install route detector came across whole**, as
  `frontend/src/pwa/installRoute.ts`, with its tests, so the card gives
  the right steps on Android Firefox, a Mac and Windows Firefox too, not
  only an iPhone. Its hook did not: Juttu's `useInstallRoute` is a few
  lines on Juttu's own install prompt store, without Quill's record of a
  finished install, which Juttu has no reminder to stop.
- **`docs/dev-box.md` said the install button was at the top right of
  the page.** It now sends people to Settings.

## Phase 2: the connection status, as Quill has it

- [x] **Port Quill's connectivity**, `frontend/src/lib/connectivity/`
      in Quill: `ConnectivityContext.tsx` and `NavigationBlocker.tsx`,
      with their tests. The context listens for the browser's `online`
      and `offline` events and for two window events the API client
      sends, `app:network-error` and `app:api-success`. While the backend
      is out of reach it polls `/api/health` every 10 seconds. Juttu's
      `frontend/src/api/health.ts` already has a `checkHealth`; use it
      rather than Quill's copy.

- [x] **Make Juttu's API client send those events**,
      `frontend/src/api/client.ts`: `app:network-error` when a request
      cannot reach the backend, and `app:api-success` when one answers,
      as Quill's `lib/api.ts` does. A refused request, such as a 403, is
      an answer, not a lost connection.

- [x] **Show the strips and the modal**, in `MainLayout.tsx`, as Quill's
      `MainLayout` does: Juttu's `StatusStrip`, already ported, in its
      "offline" variant with the last sync time and its "reconnected"
      variant, and Juttu's `OfflineModal`, already ported, when somebody
      tries to move on while offline. Put the provider and
      `NavigationBlocker` in `RootLayout.tsx`, as Quill does. The
      reconnected strip clears on the next page change.

- [x] **Tests and stories:** the ported context and blocker tests, a
      client test for each event, and a `MainLayout` test that shows the
      offline strip, then the reconnected one. A `MainLayout` story while
      offline.

Found while building, 23 November 2026:

- **Juttu's connectivity lives in `frontend/src/connectivity/`**, since
  Juttu has no `lib/` folder.
- **Outside a provider, `useConnectivity` reads as online** instead of
  throwing, as Juttu's live context does. So `MainLayout`, rendered on
  its own in its tests and stories, needs no provider.
- **A proxy's 502, 503, 504 or 530 without JSON counts as lost**, as in
  Quill. The box copy's Caddy answers 502 when the backend is down, and
  `fetch` does not throw for that.

## Phase 3: Home is just "Conversations"

- [ ] **Tidy `frontend/src/pages/HomePage.tsx`**, items 1, 7, 8 and 9.
      Remove the "Backend up" card, and with it the `checkHealth` effect,
      now that Phase 2 shows the connection everywhere. Delete
      `components/health-status/`, with its stories and tests. Remove the
      line "A quiet place for a team, its pipeline and its agents to
      talk." Title the page "Conversations", and remove the `Heading`
      "Your conversations". The navigation entry keeps its name, "Home".
      The table stays for this phase, so this pull request is only
      removals.

- [ ] **Tests and stories:** update `HomePage.test.tsx` and
      `HomePage.stories.tsx` for the new title, and for the card and
      heading being gone.

## Phase 4: each space has a kind, Dev, Personal or Clinical

- [ ] **Add `Space.kind`**, `backend/app/spaces/models.py`: a
      `TextChoices` of `dev`, `personal` and `clinical`, labelled "Dev",
      "Personal" and "Clinical", in that order, which is Home's order
      until a person sets their own. Keep `is_clinical` as it is, since
      access rules read it. A check constraint holds the two together: a
      space is clinical exactly when its kind is `clinical`. The
      migration, in the spaces app, gives every existing clinical space
      the kind `clinical` and every other one `dev`. It deletes nothing,
      and undoing it drops the column.

- [ ] **Choose the kind when a space is made.** `create_space` in
      `backend/app/spaces/services.py` takes `kind` and sets
      `is_clinical` from it, and the audit detail records it. `POST
/api/spaces` takes `kind`, defaulting to `dev`, and still accepts
      `is_clinical` for the old form: `true` means `clinical`. Space
      bodies gain `kind`. On the "New space" page, a choice of the three
      kinds replaces the clinical switch, with Clinical's existing
      warning kept. A kind is fixed once the space is made, as the
      clinical flag is.

- [ ] **Tests and stories:** the migration's mapping, the constraint
      refusing a clinical space of another kind, each kind made through
      the route, and the old `is_clinical` still working. The "New space"
      page test and story for the three kinds.

## Phase 5: channel icons, and turning people's circles off

- [ ] **Give every conversation a random icon, kept**,
      `backend/app/conversations/models.py`: `Conversation.icon`, the
      name of one of a short list of friendly Tabler icons, and
      `Conversation.icon_colour`, one of the gradients that
      `frontend/src/components/profile-pic/gradients.ts` holds, both
      picked at random when the conversation is made. Keep the list of
      icon names in the backend as a `TextChoices`, so the frontend can
      only be sent names it draws. The migration gives each existing
      conversation its own random pair.

- [ ] **Let an organisation admin turn a channel's circles off**:
      `Conversation.shows_people`, true by default, set by `POST
/api/conversations/{id}/shows-people` with `{"shows_people":
false}`. Only an organisation admin may, and it is audited as
      `CONVERSATION_SHOWS_PEOPLE_CHANGED`. A direct conversation always
      shows its people, so the route refuses one with 400.

- [ ] **An ellipsis menu on the conversation page**, for organisation
      admins only, using Juttu's `components/ellipsis-menu`, with "Hide
      people's circles" or "Show people's circles". Phase 6 adds the icon
      items to the same menu.

- [ ] **A `ConversationIcon` component**,
      `frontend/src/components/profile-pic/ConversationIcon.tsx`, with
      stories and tests: the Tabler icon on its gradient, in a circle the
      size of a `ProfilePic`. It draws an uploaded image instead once
      Phase 6 sends one.

- [ ] **Tests:** the random pair is kept and valid, the migration fills
      every row, only an admin may change `shows_people`, a direct
      conversation is refused, and the menu shows for an admin only.

## Phase 6: uploading a channel's own icon

- [ ] **Add Pillow**, the Python imaging library, to
      `backend/pyproject.toml`, with the lock file, and its type stubs
      if mypy needs them.

- [ ] **Keep the image in the database**: a `ConversationIcon` model
      holding one PNG of at most 256 by 256 pixels as a `BinaryField`,
      with the conversation, who uploaded it and when. One per
      conversation, so a new upload replaces the old.

- [ ] **`PUT /api/conversations/{id}/icon` takes one image**, for an
      organisation admin only, and `DELETE` removes it. Juttu refuses a
      file over 1 MB before reading it, opens it with Pillow, refuses
      anything that is not PNG, JPEG or WebP whatever its name says,
      crops it to a centred square, shrinks it to 256 pixels and saves it
      as PNG, which also drops any metadata in it. Both are audited.
      `GET /api/conversations/{id}/icon` answers the PNG to anybody who
      may read the conversation, and 404 otherwise, with a cache header
      and the image's version in the address, so a new upload shows at
      once.

- [ ] **Upload and remove from the ellipsis menu**: "Upload icon" opens
      a file picker for images, and "Remove icon" asks to confirm.
      Conversation bodies gain `icon_url`, or `null`, and
      `ConversationIcon` draws it in place of the random icon.

- [ ] **Tests:** a PNG, JPEG and WebP each stored as a 256 pixel PNG, a
      file over 1 MB, a text file named `.png`, a member refused, the
      image refused to somebody outside the space, and removing it
      bringing the random icon back.

## Phase 7: the conversation list, as Quill shows patient conversations

- [ ] **Send what the list needs from `GET /api/conversations`**,
      `home_conversation_body` in `backend/app/conversations/views.py`.
      Add `last_item`, the newer of the newest message and the newest
      card change, or `null` for neither: its text (a message's body, or
      a card's title and current line, such as "Run 4512: Passed") and
      its time. A corrected message shows its newest correction, as the
      conversation does. Add `people`: the others the person would see
      as circles, by id and display name, or an empty list when the
      conversation shows its icon instead. A channel shows its people
      when `shows_people` is on and its space has at most 4 members
      besides the person looking. A direct conversation does the same,
      so a big one shows its icon too. Add the space's `kind`, and
      `icon`, `icon_colour` and `icon_url`. Fetch the newest items with
      `Subquery`, as `last_active_at` is fetched now, so the list stays a
      fixed number of queries however many conversations there are, and
      prove it with `django_assert_num_queries`.

- [ ] **Show the list with Juttu's `MessagesList`**,
      `frontend/src/components/messaging/MessagesList.tsx`, already
      ported from Quill and not yet used, grouped under one heading for
      each space. Spaces come in kind order, Dev, then Personal, then
      Clinical, and A to Z within a kind. Phase 8 lets a person change
      that. Within a space, the most recently active conversation comes
      first. `MessagesList` draws `ProfilePic` with initials for one
      person and `StackedProfilePics` for several. Add a way for it to
      draw `ConversationIcon` when `people` is empty. Give each person a
      gradient from their id, so the same person keeps the same colour
      everywhere. A click opens the conversation, and the live reload,
      unread badges, empty and error states stay.

- [ ] **Tests and stories:** backend tests for `last_item` (a message, a
      card change, a correction, none) and for `people` at 4 and at 5
      others, with `shows_people` off, and for a direct conversation.
      `HomePage.test.tsx` covers the grouping and order, both kinds of
      icon, a click, unread counts, the empty list and an error. Update
      `HomePage.stories.tsx` and the demo data.

## Phase 8: each person's own order of spaces

- [ ] **Keep each person's order**: a `SpaceOrder` model in the spaces
      app, one row per person and space with a position. `GET
/api/me/space-order` answers the person's spaces in their order,
      with any space they have no position for after the rest in the
      kind order. `PUT /api/me/space-order` takes the whole list of space
      ids, and refuses a space the person is not in. Each person may only
      read and change their own.

- [ ] **A "Space order" card on Settings**: the person's spaces in their
      order, each with "Move up" and "Move down" buttons, and the first
      and last buttons turned off. Each move saves at once, and a failed
      save puts the list back and says so. Home follows the order.

- [ ] **Tests and stories:** a person's order kept and used on Home, a
      new space joining at the end, somebody else's space refused, and
      the buttons at the ends turned off. A story for the card.

## Phase 9: an Admin heading, with Senders beneath it

- [ ] **Add "Admin" to the navigation, as Quill has it**, items 3 and 4,
      in `navItems.ts`: label "Admin", `href` "/admin", icon
      "adjustments" (Quill's, `IconAdjustmentsHorizontal`, already in
      `appIcons.ts`), `keepsDrawerOpen: true`, as Quill sets it so a
      phone's drawer stays open to show what is under it. Its one child
      is Senders, with the new "webhook" icon, keeping its child link
      "Register sender". Members stays where it is, at the top level of
      `ADMIN_NAV_ITEMS`, before Admin.

- [ ] **Add the "webhook" icon to `NavIcon`**,
      `frontend/src/components/icons/NavIcon.tsx`: a new `IconName`,
      `IconWebhook` in `appIcons.ts` and `iconCatalogue`, and its story.

- [ ] **Add a placeholder Admin page at `/admin`**, under
      `RequireAdmin`, `frontend/src/pages/AdminPage.tsx`: a `PageHeader`
      "Admin" and one line, "Admin tools are listed under Admin in the
      menu." Senders keeps its address, `/senders` (see Decisions).

- [ ] **Tests and stories:** navigation tests for Admin and Senders
      shown to an admin only, and opened on `/senders` and
      `/senders/new`. An Admin page test, and "No access" for a member. A
      story for the navigation with Admin open.

## Phase 10: the Juttu wordmark in Finlandica Headline

- [ ] **Draw the wordmark**, `frontend/public/wordmark-white.svg`, item
      5: "Juttu" in Finlandica Headline at weight 700, white, each
      letter's outline a path so the file needs no font. Make it as
      Turva's was, in `turva-port-quill`'s
      `docs/docs/plans/2026-11-06-storybook-brand-switch-plan.md`, Phase 8. Shape it with HarfBuzz so the font's kerning applies, and
      outline it with fontTools, in a throwaway environment in the
      scratchpad. The file is artwork, made once, so no script is kept.
      The font is Fontsource's `finlandica-headline` 5.3.0,
      `latin-700-normal`, under the SIL Open Font Licence. Finlandica was
      made for Finland's country brand, and Juttu is a Finnish word. Fit
      the box from the cap height to a little below the baseline, as
      Turva's is.

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

- **Senders keeps its address**, `/senders`, rather than moving under
  `/admin/`. The navigation nests it by its children, not by its
  address, so nothing needs to move. Bookmarks and `docs/dev-box.md`
  stay right.
- **Settings comes before the Home tidy**, so the notifications card
  always has a page. Removing it from Home first would leave a phone
  with no way to turn notifications on.
- **The connection status lands before the "Backend up" card goes**, so
  there is never a time with no sign of a lost connection.
- **Space kinds and channel icons land before the new list**, so Phase 7
  draws real data instead of placeholders, and each of those pull
  requests holds its own migration.
- **`is_clinical` stays beside the new kind.** Access rules and the
  plan's clinical protections read it, so replacing it would touch
  safety-relevant code for no gain. A check constraint keeps the two in
  step.
- **Uploaded icons are re-encoded, never stored as sent.** Saving
  Pillow's own PNG drops metadata, such as where a photo was taken, and
  anything hidden in the file.
