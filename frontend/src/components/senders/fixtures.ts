/** Made-up senders and channels for the stories and tests. */

import type { Sender, SenderChannel } from "@/api/senders";

export const DEPLOYS_CHANNEL: SenderChannel = {
  id: 11,
  name: "deploys",
  space: { id: 7, name: "Release" },
};

export const IDEAS_CHANNEL: SenderChannel = {
  id: 14,
  name: "ideas",
  space: { id: 9, name: "Design" },
};

export const DEPLOYS: Sender = {
  id: 1,
  name: "Deploys",
  channel: DEPLOYS_CHANNEL,
  created_at: "2026-11-21T20:00:00Z",
  closed_at: null,
};

export const OLD_BUILDS: Sender = {
  id: 2,
  name: "Old builds",
  channel: IDEAS_CHANNEL,
  created_at: "2026-11-20T09:00:00Z",
  closed_at: "2026-11-21T10:00:00Z",
};
