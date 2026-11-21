# Juttu vision and first version plan

Juttu is a messaging service anyone can use, designed first for healthcare.
It has three uses, built in this order: a software team talking with its
build pipeline and its AI agents, clinicians talking to clinicians, and
clinicians talking to patients. The first version is for the four people
building Turva. No existing service let a large language model (LLM) and a
continuous integration and delivery (CI/CD) pipeline take part without
burying the people in noise, so the team is building its own. Starting with
developers also means the first version holds no patient data, and its
makers are its first users.

The outcome of this plan is a working first version for the Turva team: a
progressive web app (PWA), as Quill Medical is, running in Docker, where
people, pipeline and agents share one quiet place. It is built and proved
on the dev box first, reached over the team's private network, before any
external server is rented. The
core it is built on, accounts, conversations, live delivery, audit and
identity that can carry roles, is the same core the two healthcare uses
need later. Each phase below is one pull request's worth of work. Phases 1
to 7 are built by the [skeleton plan](2026-11-21-juttu-skeleton-plan.md).

## Open questions

- [x] **Are messages end-to-end encrypted?** - Not in the first version. Messages are encrypted in transit and on disk, and the server can read them, which keeps search, agents and the pre-send check simple. The message format leaves room for end-to-end encryption in chosen spaces later. Answered in `/t-g`, 21 November 2026.

- [x] **What is ported from Quill Medical, and what is written new?** - Four things are ported: the tooling and checks (`just` recipes, pre-commit hooks, spelling and lint configuration, test set-up, the worktree recipe and the pipeline that runs them); the sign-in and session code; the frontend shell and components (the PWA shell, service worker, push notification code and the Mantine component set with its stories); and the organisation tree and competency model, as the base for roles. Quill's messaging code stays behind: its design carries over but its code is tied to patients and the health record server. Both projects are AGPL-3.0, so the code can move. Answered in `/t-g`, 21 November 2026.

- [x] **Which licence?** - AGPL-3.0: anyone who runs a changed Juttu as a service must publish their changes, which keeps an open healthcare service from being taken closed. Answered in `/t-g`, 21 November 2026.

- [x] **How do people sign in?** - Juttu has its own accounts, with the sign-in and session code ported from Quill Medical. It works for healthcare later with no rewrite, and other methods can be added beside it. Answered in `/t-g`, 21 November 2026.

- [x] **Which model does the developer version use?** - Hosted Claude, through the API, behind an interface that lets an in-house model replace it without touching the features. Answered in `/t-g`, 21 November 2026.

- [x] **What may an agent do?** - Nothing, until it is given a permission. Each agent starts with none and is granted each one by name: a space it may read, a space it may post in, whether it may ask questions. Answered in `/t-g`, 21 November 2026.

- [x] **Who may grant an agent a permission?** - Only an organisation admin. It is the tightest choice and a bottleneck, accepted for a team of four. Answered in `/t-g`, 21 November 2026.

- [x] **Who is an organisation admin in the first version?** - All four developers. There is no bottleneck, and the admin-only rule limits nothing until the team grows; it is there for the organisations that come later. Answered in `/t-g`, 21 November 2026.

- [x] **How is each phase planned in detail?** - With `/t-p`. This plan is the map; each phase gets its own plan, written with `/t-p` before it is built and broken into steps that each fit one pull request. `/t-f` runs those plans, not this one. Answered in `/t-g`, 21 November 2026. Replaced: see "Does `/t-f` run this plan directly?" below.

- [x] **Which things get a living card in the first version (Phases 21 and 22, numbered 5 when asked)?** - Not fixed up front. Cards are modular: each kind of card is its own module, added when the team needs it, and what a kind shows and when it notifies is decided then. Mark: "we need to be modular as the project grows". Answered in `/t-g`, 21 November 2026.

- [x] **What counts as a non-clinical setting?** - Each space carries a flag, and a new space is non-clinical by default. The first answer was clinical by default, as "most safe if you forget to change". It was reversed in the same session: a clinical space allows patient details, so a developer or social space left clinical by mistake would never warn when they were typed in. Non-clinical by default means a forgotten flag still warns. Answered in `/t-g`, 21 November 2026.

- [x] **Which rented server, and which domain?** - Not chosen yet. Both stay as Mark's jobs under "Before running /f". Phases 1 to 3 can be built and tested locally without them. Answered in `/t-g`, 21 November 2026.

- [x] **Is a pre-send warning recorded, and who can see it?** - It is private to the sender. Juttu keeps anonymous counts to hone the check, how often it fires and how often it is marked wrong, with no names and no message text. Answered in `/t-g`, 21 November 2026.

- [x] **Are the phases small enough to build from?** - They were not: eight phases, each weeks of work. Mark: "break down any phase that is too long". They are now thirty, each one reviewable pull request, so `/t-f` can run this plan directly. A phase that still proves too big when reached is split here, or given its own `/t-p` plan. This replaces the earlier answer that every phase gets a separate plan. Answered 21 November 2026.

- [x] **Where does the first version run?** - On the dev box, in Docker, reached over the team's private network, which the team already has. Mark: build and test locally "before I do all of the leg work of hosting on an external server". Renting a server and choosing a domain move to the external hosting work at the end. This replaces the earlier answer that left them as jobs before the build. Answered 21 November 2026.

- [x] **How do live messages reach the app (Phase 18)?** Server-sent events are simpler and pass through proxies easily; a WebSocket carries traffic both ways and suits typing indicators later. Blocks Phase 18 only. - Server-sent events, with Gunicorn moved to its threaded workers. The backend ran two synchronous workers, and each open live connection holds a worker for as long as the tab is open, so two tabs would have stalled it; a threaded worker gives each connection a thread instead. WebSockets would have meant ASGI, Django Channels and probably Redis. Typing indicators, if wanted later, are a second step. Answered in `/t-g`, 21 November 2026.

- [x] **Which kind of card is built first (Phase 22)?** Cards are modular and each kind is decided as needed, so the first is named when the team reaches it. Blocks Phase 22 only. - A CI run: one card per pipeline run on a branch or pull request, showing running, passed or failed, and notifying only on a failure. Answered in `/t-g`, 21 November 2026.
- [x] **Which layer encrypts messages on disk (Phase 14)?** - The disk or the Postgres volume, encrypted by the box's operating system. Juttu's code handles no keys, so search and agents work as normal. Each stored message still carries its format version and a field naming how its body is protected, at first "none at application level", so a space can move to stronger protection later. Answered in `/t-g`, 21 November 2026.
- [x] **How is the first account made (Phase 8)?** Invites arrive only in Phase 12, and need an admin to send them. - A `just` recipe runs a Django management command that asks for a username and password and makes that person an organisation admin. Nothing is seeded in code and there is no default password; it is run once per environment. Answered in `/t-g`, 21 November 2026.
- [x] **How do CI events reach the inlet (Phase 22)?** The dev box is on the team's private network, so GitHub cannot send it a webhook. - A small sender on the box asks GitHub's API for recent runs every minute or so and posts each change to the inlet, with its own inlet secret like any other sender. Outbound only: nothing on the box is exposed. It reads with a read-only GitHub token kept in the box's environment file. Answered in `/t-g`, 21 November 2026.
- [x] **How does an invite reach the person (Phase 12)?** - By email, through Amazon SES in London, ported from Quill Medical's sending code with its `EMAIL_FROM` setting and its allow-list of recipients for development. It sends from an address on the domain Quill already has verified in SES, in Quill's development email account, and moves to Juttu's own domain when one is bought. Answered in `/t-g`, 21 November 2026. Replaced: see "How does a new person get in, now that email is postponed?" below.
- [x] **Where do the vision plan's pull requests go?** - On top of the Phase 8 pull request of the components work, #21, the one still open: Mark merged #1 to #20 on 21 November 2026. A new stack key names the new area. Answered in `/t-g`, 21 November 2026.
- [x] **Does `/t-f` run this plan directly?** An earlier answer said each phase gets its own `/t-p` plan first; a later one said the phases are now small enough to build from. - `/t-f` runs this plan directly, one pull request per phase, researching and logging decisions as it goes. The earlier answer is kept above, marked as replaced. Answered in `/t-g`, 21 November 2026.
- [x] **What does the possible-offence check do in a clinical space (Phase 30)?** Neither an on-device nor an in-house model exists in the first version. - It does not run there. The check runs only in non-clinical spaces, through the hosted model, and a clinical space's settings say plainly that it is off, until an on-device or in-house model exists. Nothing from a clinical space ever reaches an outside service. Answered in `/t-g`, 21 November 2026.
- [x] **How does a new person get in, now that email is postponed (Phase 12)?** Mark postponed email on 21 November 2026: "I can just add people as needed". - As in Quill Medical's admin user form, without its invite email: an organisation admin types the new person's name, username and password on the admin screen, and tells them the password. Nothing is emailed, so SES is not needed for Phase 12. Email invites, and a forgotten password sent by email, move to "Later". Mark: "I add users like we do in quill but no need to send email invites." Answered 21 November 2026.
- [x] **Do the jobs left for a person stop `/t-f` (Phases 14, 19, 22 and 26)?** Mark asked to build without deploying to the dev box for now. - No. Each job is needed to run Juttu on the box with real data, not to build it, since every test runs locally or in CI on throwaway data with stand-ins. They move to "Before deploying to the dev box", and `just box-deploy` waits past Phase 14 until the disk encryption box is ticked. Answered 21 November 2026.

## Before running /f

- [x] Set up branch protection and required checks on the repository - Not now. Mark: "we are building fast, and I am the only dev (with you)". Every phase still lands through a pull request; protection is added when a second developer joins. Decided 21 November 2026.
- [x] Switch on HTTPS certificates for the dev box - Moved to the skeleton plan, where Phase 7 needs it. 21 November 2026.
- [x] Postponed, not done: email was put off on 21 November 2026, so Phase 12 no longer needs this, and it returns with the email work under "Later". In Quill's development AWS email account, make an AWS user that may send from an address on Quill's verified domain in SES in London (eu-west-2) and nothing else. Put its key in the dev box's environment file as `SES_ACCESS_KEY_ID` and `SES_SECRET_ACCESS_KEY`, with `EMAIL_FROM` set to the sending address and `EMAIL_ALLOWED_RECIPIENTS` set to the four developers' addresses. Never in the repository. Needed from Phase 12.
- [x] Moved, not done: the four jobs that were here, the GitHub token, the Web Push keys, the disk encryption check and the hosted model's key, are needed to run Juttu on the dev box, not to build it. They are under "Before deploying to the dev box" below. 21 November 2026.

## Before deploying to the dev box

Building and testing never touch the dev box: tests use throwaway databases, made-up messages and stand-ins for GitHub, Web Push and the model. These jobs come before `just box-deploy` deploys the phase each one names, and none of them stops `/t-f`.

- [ ] Make a read-only GitHub token for `bailey-medics/juttu-messaging` that can read Actions runs, and put it in the dev box's environment file. Never in the repository. Needed from Phase 22.
- [ ] Once Phase 19 has landed, run its recipe on the dev box, `just box-push-keys mailto:<the team's address>`, to generate the Web Push signing keys into the box's environment file with the address push services may write to. Phase 19's own tests use throwaway keys, so this does not block the run.
- [ ] Check the dev box's disk, or the volume Postgres keeps its data on, is encrypted by the operating system, and turn encryption on if it is not. Needed from Phase 14, when messages are stored.
- [ ] Create an API key for the hosted model and put it in the dev box's environment file, never in the repository. Needed from Phase 26.

## Phases 1 to 7: Skeleton

- [x] Built by the [skeleton plan](2026-11-21-juttu-skeleton-plan.md): repository basics, backend, database, frontend, the PWA shell, the dev stack and pipeline, and the copy on the dev box. Split out on 21 November 2026 so building could start; the phases below keep their numbers so the references to them stay right.

## Phase 8: Accounts and sign-in, backend

- [x] Port the user model, password hashing, cookie sessions and the CSRF check from Quill Medical, with sign-in, sign-out and "who am I" endpoints. Every endpoint makes an explicit authorisation decision, and a test fails if a new endpoint is added without one. Port the rate limit on sign-in. Add a management command, run by a `just` recipe, that asks for a username and password and makes the first account; it becomes an organisation admin once Phase 11 adds organisations. Nothing is seeded and there is no default password.

- [x] Found while building: Quill Medical's backend is FastAPI, so its design came across in the Django form Turva already gives it. Django supplies Argon2 hashing, sessions in Postgres and the CSRF check; `app/accounts` holds a username-only `User`, `GET /api/auth/me`, `POST /api/auth/sign-in` and `POST /api/auth/sign-out`, and `app/endpoints_test.py` fails when a route's view does not state its own `permission_classes`. The cookies are named `juttu_session` and `juttu_csrftoken`, because cookies on localhost ignore the port and Quill's and Turva's stacks run on the same machine. Passwords need fifteen characters, as NIST SP 800-63B-4 asks where a password is the only factor. The rate limit keeps its count in Postgres, not in memory, so both Gunicorn workers share it, and the sign-in view runs outside the per-request transaction so a failed attempt's count is not rolled back. It reads the client's address from the last `X-Forwarded-For` entry, the one Caddy writes. Behind the private network's HTTPS proxy on the dev box every phone arrives from the proxy's address, so the team shares one limit of five a minute there; trusting that proxy in the box's Caddy would make it per person. `just first-account` and `just box-first-account` refuse once any account exists. The mypy hook now installs `psycopg`, which Django loads once a model exists.

- [x] Found after landing: signing in on the dev box failed Django's CSRF check. The private network's proxy ends HTTPS and passes plain HTTP to the box's Caddy, so Django saw an HTTPS page posting to an HTTP site. `s/box` now passes the box's HTTPS address to the backend as `JUTTU_CSRF_TRUSTED_ORIGINS`, worked out from `local/box.env` so no address is in the repository. Checked by signing in over the private network on 21 November 2026.

## Phase 9: Sign-in, frontend

- [x] Port the sign-in page, the signed-in guard on routes and the sign-out control. Tests for the guard and the page.

- [x] Found while building: Quill Medical's `AuthContext`, `RequireAuth`, `GuestOnly`, `CannotReach`, `LoginForm` and `LogoutNavLink` came across without its two-factor code, register link, forgotten password link and roles, as `frontend/src/auth/`, `SignInForm` and `SignOutNavLink`. The page is `/sign-in`, in the words the backend uses. Quill reloads the whole page after signing in; Juttu's `GuestOnly` sends the person on with the router instead, to the page `RequireAuth` sent them from, and only to a path inside the app. `GET /api/auth/me` answers 200 for somebody not signed in, so a failed request means the backend is unreachable, never that the session ended, and the guard says "No connection" instead of asking to sign in again. Every page test that rendered the whole app now signs in first, through `renderSignedInAt` in `frontend/src/test/render.tsx`.

## Phase 10: Audit trail

- [x] Add an append-only audit table and one function that writes to it, and record every sign-in, sign-out and failed sign-in. From here on, every phase that changes data writes an audit entry, and its tests check for it.

- [x] Found while building: neither Quill Medical nor Turva has an audit table to port, so `backend/app/audit` is new. `AuditEvent` keeps what happened, the account, the client's address, the time and a small `detail`. A Postgres trigger in its first migration refuses every `UPDATE`, `DELETE` and `TRUNCATE`, so the rule holds for a script or a person at `psql`, not only for Django. Django's own sign-in signals write the three entries, so every way in or out is caught whichever view calls `login`, `logout` or `authenticate`. A failed sign-in names the account it tried, when there is one, but never stores the text typed as the username: people sometimes type their password there, and OWASP's logging cheat sheet says a log must never hold a password. The action is a Python enum rather than choices on the column, so a later phase adds one without a migration. `client_address` in `backend/app/client_address.py` reads the address by the same rule as the sign-in rate limit, and a test holds the two together. Two things for later phases: a sign-in refused by the rate limit is not recorded, since it never reaches `authenticate`; and a test that needs `transaction=True` will meet the `TRUNCATE` guard when pytest-django empties the tables, so Phase 18 may need to exclude this table from that flush.

## Phase 11: Organisations and roles

- [x] Port Quill Medical's organisation tree and competency model, leaving out everything about patients and clinical records. One organisation exists for the Turva team. Identity can carry a role, so "the on-call registrar" fits later without a rewrite.

- [x] Found while building: `backend/app/organisations` keeps Quill Medical's shape at a fraction of its size. `OrgUnit` is one tree, with organisations as its roots, and a database constraint that only an organisation has no parent; its types are organisation and team, with Quill's hospitals, wards and rooms left out. `OrgUnitMember`, `CompetencyGrant` and `PositionHolding` are dated rows that are closed rather than deleted. A competency held at an org unit holds beneath it too, and a closed account holds nothing. The catalogue is the `Competency` enum, because three competencies need no shared YAML, and `Role.ORGANISATION_ADMIN` grants all three, one row each. `Position` and `PositionHolding` are Quill's posts that may be vacant, which is how "the on-call registrar" will fit. The app's first migration makes the Turva organisation and makes any account that already exists its admin, auditing those grants but not the organisation itself, which `django_migrations` already records. `create_first_account` now makes its account a member and an admin, with an `account_created` entry.

## Phase 12: Members and admins

- [x] An organisation admin can add a person, remove one and make another member an admin, as in Quill Medical's admin user form, with nothing emailed. Adding a person takes their name, username and password, typed by the admin, who tells them the password; the password meets the same fifteen-character rule as `create_first_account`. The `User` model gains the name in this phase's migration. Removing a person closes their account and membership rather than deleting them, so what they wrote still names them. Every change writes an audit entry. `create_first_account` stays for the first account only, and its refusal message changes from "every later account comes from an invite" to saying an admin adds them. All four developers are admins in the first version. Backend, a small admin screen, and tests that a non-admin is refused.

- [x] Split when reached: the backend and the screen were too much for one pull request, so this phase lands as two. The backend: `GET /api/members` and `POST /api/members`, `POST /api/members/{id}/remove` and `POST /api/members/{id}/make-admin`, each for an admin holding `manage_members` only, in `backend/app/organisations/views.py`. `User` gains `name`. Removing a person closes their account, ends their membership and grants, and ends their session at its next request; an admin cannot remove themself, so the last admin cannot lock everybody out. Making an admin an admin again writes nothing. `GET /api/auth/me` now also says the person's name and whether they are an admin, for the screen to use.

- [x] The members screen: a list of members with "Make admin" and "Remove" on each, and a page to add a person, shown in the side navigation to admins only. Built as `/members` and `/members/new`, from `MembersTable` and `AddMemberForm` in `frontend/src/components/members/`, behind `RequireAdmin`. Found while building: the add form's unsaved-changes guard stopped the move back to the list with "Leave this page?", so it is off for that short form; and `NoAccessLayout`, ported from Quill Medical, still says "Welcome to Quill" to a member who is not an admin.

## Phase 13: Spaces

- [x] A space holds conversations and has its own rules: who is in it, and whether it is clinical. A new space is non-clinical by default, so a forgotten flag still warns about patient details. Model, migration, endpoints to create a space and manage its members, and tests that a non-member cannot see it.

- [x] Found while building: `backend/app/spaces` holds `Space` and dated `SpaceMember` rows, with `GET` and `POST /api/spaces`, `GET /api/spaces/{id}`, `GET` and `POST /api/spaces/{id}/members` and `POST /api/spaces/{id}/members/{user_id}/remove`. Making a space, and changing who is in one, needs `manage_spaces`; the maker becomes its first member. A space somebody is not in answers 404 exactly as one that does not exist, so a guessed number reveals nothing. Even an admin must be in a space to see or change it, so being an admin never means reading everyone's conversations. Only a member of the organisation can be put in a space. There is no screen for spaces yet: Phase 15 adds the list of spaces and conversations.

## Phase 14: Conversations and messages, backend

- [x] Channels and direct messages are both conversations in a space. Messages are append-only, as in Quill Medical: nothing is edited in place, and a correction is a new message that amends the old one.

- [x] Messages are encrypted in transit and on disk, and readable by the server. On disk, the box's operating system encrypts the disk or the Postgres volume; Juttu's code handles no keys. The stored message carries a format version and a field naming how its body is protected, at first "none at application level", so a space can move to end-to-end encryption later without a new table.

- [x] Access is checked on the server for every read and every post, with tests that one member cannot reach another's conversation by guessing its identifier. Conversations are listed with a query that filters in the database, not after loading them all, which is the fault in Quill Medical's version.

- [x] Found while building: `backend/app/conversations` holds `Conversation`, of kind channel or direct, `Participant` rows for a direct one, and `Message`. A Postgres trigger refuses every change to a message, as the audit table's does, and a correction names the message it amends; only its author can correct it, in the same conversation. Each message stores `format_version` 1 and `protection` "none_at_application_level". `GET` and `POST /api/spaces/{id}/conversations` and `GET` and `POST /api/conversations/{id}/messages` check access on every call, and a conversation somebody cannot read answers 404. Only somebody holding `manage_spaces` opens a channel; any member starts a direct conversation with others in the space. `conversations_for` lists with one query, filtering in the database. Each post writes a `message_posted` audit entry naming the message, never its text. `GET` returns the latest 200 messages; paging further back waits until a conversation needs it.

## Phase 15: Conversations and messages, frontend

- [x] The list of spaces and conversations, the conversation view and the box to write a message, with stories and tests. Messages load when the page opens; live delivery comes in Phase 18.

- [x] Split when reached: nothing yet let anybody make a space or put people in one, so this phase lands as two. The first adds `/spaces`, the spaces a person is in; `/spaces/new`, where an admin makes one; and `/spaces/{id}`, with its conversations and people, where an admin opens a channel and puts members of the organisation in the space. A space the person is not in shows "Page not found", as the backend answers. "Spaces" joins the side navigation. A conversation's row leads to `/conversations/{id}`, which the second half adds.

- [x] The conversation view, at `/conversations/{id}`, with `Messaging` showing the messages and the box to write one, and a way to start a direct conversation with somebody in the space. Built as `ConversationPage` on Quill Medical's `Messaging`, and a "Message" entry on each person in a space, which reopens a one-to-one conversation that already exists. Found while building: the backend has no endpoint for one conversation, so the page's title comes from the space page that linked to it and reads "Conversation" after a reload; and `Messaging` empties the box as soon as it sends, so a message that fails to send says "Not sent" but loses its text.

## Phase 16: Threads

- [x] A reply can hang off a message as a thread, shown beside the conversation. Backend, frontend and tests.

- [x] Split when reached, backend first. A reply is a `Message` whose `thread` names the top-level message it hangs off; a reply to a reply joins the same thread, so a thread is one level deep, and a correction stays in its thread. Adding the column is an `ALTER TABLE`, which the append-only trigger allows, since it changes no row. `GET /api/conversations/{id}/messages` now lists top-level messages only, each with its `reply_count` counted in the same query, and `GET /api/messages/{id}/replies` reads a thread, checking the conversation as every read does. `POST` takes `thread`.

- [x] The thread on screen: each message shows how many replies it has, and opening them shows the thread beside the conversation, with a box to reply, composed from `Messaging`. Built as `ThreadPanel`, beside the conversation on a wide screen and beneath it on a phone; each message's button reads "Reply", "1 reply" or "N replies".

## Phase 17: Unread state

- [x] Each person's last-read point in each conversation, unread counts in the list, and marking read on opening. Backend, frontend and tests. Built as `ReadPoint`, the newest message id a person has seen in a conversation, which only moves forward. `GET /api/spaces/{id}/conversations` gives each conversation its `unread_count`, counted for the whole list in one query: messages by others newer than the read point, replies included. Opening a conversation or a thread posts `POST /api/conversations/{id}/read` with the newest message shown, and a space's list shows `UnreadBadge`. Marking read is not audited: a read point records what somebody has seen, never a change to what anybody said or may do, and an entry on every opening would bury the entries that matter.

## Phase 18: Live delivery

- [x] A new message reaches every open app at once, without a refresh, by server-sent events, with Gunicorn moved to its threaded workers in the prod image and the box copy, so an open connection holds a thread rather than a whole worker. The app reconnects by itself and fetches what it missed. Tests for delivery, for reconnection, and that a non-member receives nothing.

- [x] Found while building: each open app holds one stream, `GET /api/events`, opened once by `RequireAuth` for every signed-in page. Posting a message sends a Postgres `NOTIFY` that names only the conversation, never the text, so every Gunicorn worker hears every post with nothing new to run, such as Redis. Each woken stream reads, with the same access rule as `can_read`, the messages its person may read above the last id it sent. A person outside a space, or outside a direct conversation, gets nothing from it. A stream lasts five minutes and sends a comment every fifteen seconds when quiet. It ends early once the account is closed or the session has gone. The browser reconnects with the last event's id, and the app reopens a refused stream with `?after=` and a back-off that doubles up to a minute, so nothing is missed either way. Reading "everything after id N" would skip a message whose transaction committed after a later one, so posting takes a short Postgres advisory lock and ids commit in order. Gunicorn runs two `gthread` workers of sixteen threads. Caddy leaves `/api/events` uncompressed, so each event goes out at once. The space page refreshes its unread counts when a message arrives in that space.

## Phase 19: Push notifications

- [x] Port Quill Medical's Web Push code: a phone subscribes from the installed PWA, and the server sends a push when a message arrives for somebody who is not looking at the conversation. The signing keys are generated on the box and kept out of the repository.

- [x] Split when reached, backend first. A phone's subscription is stored as a `PushSubscription` in a new `app/push` app: the push service's address, checked against the known push services' hosts as Quill Medical checks it, and the two encryption keys. `GET /api/push/key` hands the app the public signing key, `POST /api/push/subscriptions` stores a subscription, and `POST /api/push/subscriptions/remove` forgets one; storing and forgetting are audited. After a message commits, everybody else who may read it is sent a push, from a background thread so that a slow push service never holds up posting. The push carries the conversation's name, who wrote, and the conversation's address, but never the message's text, because it passes through Google's, Apple's or Mozilla's servers. A subscription the push service says has gone is deleted. The keys are `JUTTU_VAPID_PUBLIC_KEY` and `JUTTU_VAPID_PRIVATE_KEY`; with none set, push is off and nothing is sent. `just box-push-keys` runs a management command in the box's backend to make a pair, and adds them to `local/box.env` once. Found while building: `pywebpush` 2.5.0, the version Quill Medical runs, brings `aiohttp` and `requests` with it. The push service is told to keep a push for twelve hours for a phone that is off, and pushes about one conversation share a topic, so a busy conversation shows one notification rather than a stack of them. Every push is signed with a contact for the push services, which Apple's requires, and `py_vapid` accepts only a `mailto:` address or an `https://` origin with no path, so the project's GitHub page cannot be it. Choosing whose address that is belongs to a person, so it is a third setting, `JUTTU_VAPID_CONTACT`, required with the keys, and `just box-push-keys` takes it as its argument.

- [x] The phone side: an "Enable notifications" button, the service worker showing a push and opening its conversation when tapped, and forgetting the device's subscription on signing out. Safari on an iPhone withdraws a subscription that receives pushes without showing them, so the server, not the phone, decides not to send: an open, visible conversation page tells the backend every half minute that its person is looking, and nobody is sent a push for a conversation they are looking at. Found while building: the button sits in a "Notifications" card on the Home page, which also says why a device cannot have them, such as Safari on an iPhone outside the installed app. The mark that somebody is looking is a `Looking` row that lasts a minute, renewed every thirty seconds by `useLooking` while the page is visible, cleared when it is hidden or left, and not audited, because it changes nothing anybody reads. Signing out forgets the device's subscription first, while the session still lets the server be told, so the next person on a shared device is not sent the last person's notifications. The service worker shows every push it is sent, even one it cannot read, and tapping a notification opens its conversation in a window of the app already open, or a new one.

## Phase 20: Quiet notification settings

- [ ] Mentions of a person by name. Each person sets what notifies them, and the default is quiet: a direct message, a mention or a question for you notifies; everything else waits to be read.

## Phase 21: Card core

- [ ] Build cards as modules. The core knows only what a card is: one message that updates in place, with a thread of its events beneath it and a rule for when it notifies. Each kind of card is a separate module that plugs into that, so a new kind is added without touching the core or the other kinds. This phase builds the core, its interface for modules and a test-only kind to prove it.

## Phase 22: Event inlet and the first kind of card

- [ ] An inlet that accepts events from outside tools, each sender with its own secret and every event checked against it. CI events come from a small sender on the box that asks GitHub's API for recent runs every minute or so, with a read-only token, and posts each change to the inlet; nothing on the box is exposed to the internet. An event never becomes a message: it finds or creates its card and updates it.

- [ ] The first real kind of card: a CI run, one card per pipeline run on a branch or pull request, showing running, passed or failed. A card notifies only when it needs somebody: a failed run notifies, a passing one is silent.

## Phase 23: Agent identity and permissions

- [ ] An AI agent, such as a Claude Code session, is a named member with its own identity and its own access token. It starts with no permissions at all and is granted each one by name: a space it may read, a space it may post in, whether it may ask questions. Only an organisation admin can grant one, and every grant is in the audit trail. Tests that an agent with no grants can do nothing.

## Phase 24: Agents read and post

- [ ] The interface an agent uses to read and post, checked against its grants on every call, with a short guide to connecting a Claude Code session. An agent can be mentioned.

## Phase 25: Questions from agents

- [ ] A question from an agent is its own kind of message: it arrives with answer buttons, goes to the right person, waits, and is recorded with who answered and when. The agent is told the answer.

## Phase 26: Model interface

- [ ] One interface for asking a model something, with hosted Claude behind it, so an in-house model can replace it later without touching the features. Tests run against a stand-in, never the real service.

## Phase 27: Digest

- [ ] "Since you were last here": a short summary of what changed and what, if anything, needs you, written through the model interface.

## Phase 28: Pre-send check, the framework

- [ ] Before a message is sent, it is checked against the rules of the space it is going into. Each check is a module, as each kind of card is. If one trips, the sender sees what and why, and chooses to edit or send anyway. It asks; it does not block, unless an organisation sets a hard stop.

- [ ] The warning is private to the sender. Every warning has a "this warning was wrong" button, and Juttu keeps only anonymous counts of how often a check fires and how often it is marked wrong, with no names and no message text.

## Phase 29: Pre-send check, patient details

- [ ] Plain pattern rules, no model: an NHS number has a check digit and can be recognised with very few false alarms; dates of birth and postcodes follow patterns. They warn in every non-clinical space. Tests with made-up numbers only.

## Phase 30: Pre-send check, possible offence

- [ ] A model judges tone towards a person, not vocabulary. It runs only in non-clinical spaces; in a clinical space it is off, and the space's settings say so, until an on-device or in-house model exists: clinical talk is full of blunt words that a general filter would flag all day. It starts with high-confidence cases only and is honed on the developer team before any clinician sees it.

- [ ] A draft is never sent to an outside AI service once patient data is in play: asking an outside service whether text contains patient details would itself leak them. The check then runs on the device or on the organisation's own model.

## Later, each with its own plan

- [ ] Email: invites as single-use links that expire, and a forgotten password sent by email, through Amazon SES in London, with Quill Medical's sending code, its `EMAIL_FROM` setting and its allow-list of recipients for development ported. Tests never reach SES. Postponed on 21 November 2026; the SES job under "Before running /f" returns with it.

- [ ] External hosting: rent a virtual private server (VPS) that can run Docker, choose a domain, and move the proved service from the dev box to it. These are Mark's jobs and wait until the local version has earned them.

- [ ] Clinician to clinician: messaging a role, urgent messages with acknowledgement and escalation, conversations tied to a patient, verified staff identity, retention rules, and a clinical safety case under DCB0129.

- [ ] Clinician to patient: patient identity, consent and a stricter safety case.

- [ ] Quill Medical as a customer of Juttu: Quill keeps the patient link and the health record, and hands the messaging itself to Juttu, so there is one messaging engine and not two.

## Decisions

- **Developers first, then clinicians, then patients** - the first use has no patient data and needs no clinical safety case, and the team feels every rough edge itself before anybody in a hospital does.

- **Build our own, on the stack Quill Medical uses** - the team knows it and has the tooling. Building on Matrix, an open messaging standard, was considered: it brings live delivery, apps and encryption ready-made, but its model would force Quill's design to be reshaped and adds a stack to learn and run.

- **A PWA, not native apps** - one codebase for phone, desktop and web, as Quill Medical already does, and far less work for a team of four.

- **Docker on a plain server, not Google Cloud** - simpler and cheaper to run, and anyone can self-host the same way, which an open-source service needs.

- **The dev box first, an external server later** - the team already shares a private network, so a copy on the dev box reaches all four phones with no public address, no domain and no bill. Hosting is real work, and it waits until the service is worth it.

- **Quill Medical's messaging design is kept, its code is not** - append-only messages, amendments, conversation status and access through team membership suit healthcare. The code assumes a patient on every conversation and leans on the rest of Quill.

- **The service judges what deserves attention** - living cards, quiet defaults and the digest are one idea: noise is designed out, not muted afterwards. The pre-send check is the same judgement pointed at outgoing messages.

- **Modular as it grows** - the core stays small, and features such as card kinds, sign-in methods, models and pre-send checks plug into it. What each module does is decided when it is needed, not guessed at now.

- **Healthcare needs are in the core from the start** - audit, role-ready identity and the encryption decision are settled while only developers use it, because each is very hard to add to a service already in use.
