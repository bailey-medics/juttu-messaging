# The copy on the dev box

The dev box runs a long-running copy of Juttu for the team's phones. It is
apart from the development stack in every way: its own Compose project
(`juttu-box`), its own database and its own port, 8290. It runs the
production images, built from the latest `main`.

It listens on the dev box only. The private network's HTTPS proxy puts it
in front of the team's phones and laptops, with a real certificate, and
nobody outside the private network can reach it. No address or machine name
is written in this repository. Where one is needed, it lives in
`local/box.env`, which git ignores.

## Set it up, once

These steps are done once, on the dev box, by a person.

1. Deploy it for the first time:

   ```sh
   just box-deploy
   ```

   The first deploy makes `local/box.env`, with a random database password
   and a random Django secret key.

2. Put it behind the private network's HTTPS proxy, on port 8290:

   ```sh
   sudo tailscale serve --bg --https=8290 http://127.0.0.1:8290
   ```

   Port 443 already serves another app on this box, so Juttu has its own
   port. The private network keeps this setting through a restart.

3. Write the address phones open into `local/box.env`. The backend answers
   only the host names it is told, so until this is set it refuses
   requests sent to that address. Each deploy also prints it:

   ```sh
   JUTTU_BOX_ADDRESS=<the box's private network name>:8290
   ```

   Then deploy again, with `just box-deploy`, so the backend reads it.

4. Check it from a laptop on the private network, at
   `https://<the box's private network name>:8290/api/health`. It answers
   `{"status":"ok"}`.

5. Make the first account, once, typing its username and a password of
   at least fifteen characters:

   ```sh
   just box-first-account
   ```

   Nothing is seeded and there is no default password. The account is an
   admin of the Turva organisation. It refuses once any account exists:
   an organisation admin adds every later account.

6. Make the Web Push signing keys, once, so phones can be sent
   notifications. Give it the address push services may write to about
   Juttu's pushes, which Apple's requires:

   ```sh
   just box-push-keys mailto:<the team's address>
   ```

   It adds `JUTTU_BOX_VAPID_PUBLIC_KEY`, `JUTTU_BOX_VAPID_PRIVATE_KEY` and
   `JUTTU_BOX_VAPID_CONTACT` to `local/box.env`, then asks you to deploy
   again. It keeps keys that
   are already there, because a new pair would end every phone's
   subscription. Until the keys are set, push notifications are off.

7. Let each deploy keep a card up to date in Juttu, once:
   1. Sign in to the copy as an organisation admin, and open **Senders**.
   2. Tap **Register sender**, name it "Deploys", and choose the channel its
      cards should appear in.
   3. Copy the secret it shows, which it shows only once, and add it to
      `local/box.env` as one line:

      ```sh
      JUTTU_BOX_INLET_SECRET=<the secret>
      ```

   From the next deploy on, the channel shows one card per deploy:
   "Deploying", then "Deployed" or "Failed at" the step that broke. Both of
   those notify everybody in the channel who has not turned notifications
   off. Until the secret is set, a deploy says so and sends no card. A card
   that cannot be sent never stops a deploy.

8. Let the box watch the repository's GitHub Actions runs, once:
   1. On GitHub, make a fine-grained personal access token for
      `bailey-medics/juttu-messaging` only, with **Actions: read** and
      nothing else.
   2. Add it to `local/box.env` as one line:

      ```sh
      JUTTU_GITHUB_TOKEN=<the token>
      ```

   3. On the box copy's **Senders** page, register a sender called
      "GitHub runs", choose its channel, and add its secret too:

      ```sh
      JUTTU_BOX_GITHUB_SECRET=<the secret>
      ```

   4. Deploy again, so the watcher reads them.

   About once a minute the watcher asks GitHub for the latest runs. It
   shows each run as a card that reads "Running", then "Passed", "Failed"
   or "Cancelled", and every finished run notifies. It only makes outgoing
   connections. The runs already there when it starts are not sent, so a
   restart never repeats a notification.

## Deploy the latest main

```sh
just box-deploy
```

It fetches `origin/main`, exports a clean copy of it into
`local/box-build/` and builds from that, never from your working tree. It
then migrates the database and restarts the copy. The database is kept.

```sh
just box-status    # which commit is running, and its containers
./s/box logs       # follow the logs
./s/box down       # stop it, keeping its database
```

## Install Juttu on a phone

The phone must be on the private network first, with its app signed in.

### Android, in Chrome

1. Open `https://<the box's private network name>:8290` in Chrome.
2. Tap **Install Juttu**, at the top right of the page. If it is not there,
   open Chrome's menu (the three dots) and tap **Add to home screen**, then
   **Install**.
3. Juttu's speech-bubble icon appears on the home screen. It opens without
   Chrome's address bar.

### iPhone, in Safari

Safari never offers the **Install Juttu** button, so Juttu is added from
the share menu.

1. Open `https://<the box's private network name>:8290` in Safari.
2. Tap the share button (a square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Juttu's icon appears on the home screen.

### When the phone is offline

Juttu shows its own page saying it is offline, with a **Try again** button.
It never shows old messages as though they were new.

### After a deploy

The installed app picks up a new deploy the next time it is opened with a
connection. If it looks out of date, close it fully and open it again.
