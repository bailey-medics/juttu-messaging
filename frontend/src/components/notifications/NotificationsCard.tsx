import { Button, Group, Stack } from "@mantine/core";

import BaseCard from "@/components/base-card/BaseCard";
import { BodyText, ErrorMessage, Heading } from "@/components/typography";
import type { PushState } from "@/pwa/push";

/** What the card says for each state, and whether it offers the button. */
const WORDING: Record<PushState | "checking", { text: string; offer: boolean }> = {
  checking: { text: "Checking whether this device can show notifications.", offer: false },
  unsupported: {
    text: "This browser cannot show notifications. On an iPhone, add Juttu to your home screen and open it from there.",
    offer: false,
  },
  off: { text: "Notifications are not set up on this server yet.", offer: false },
  denied: {
    text: "Notifications are blocked for Juttu. Allow them in your browser's settings, then come back here.",
    offer: false,
  },
  available: {
    text: "Get a notification on this device when a message arrives and you are not looking.",
    offer: true,
  },
  on: { text: "This device gets a notification when a message arrives.", offer: false },
};

export interface NotificationsCardProps {
  /** Where this device stands, or "checking" while that is found out. */
  state: PushState | "checking";
  /** True while the browser is asking the person and subscribing. */
  busy?: boolean;
  /** Something went wrong last time, so the person may try again. */
  failed?: boolean;
  onEnable: () => void;
}

/**
 * Whether this device shows notifications, and the button to turn them on.
 * Ported in spirit from Quill Medical's `EnableNotificationsButton`.
 */
export default function NotificationsCard({
  state,
  busy = false,
  failed = false,
  onEnable,
}: NotificationsCardProps) {
  const { text, offer } = WORDING[state];

  return (
    <BaseCard>
      <Stack gap="sm">
        <Heading>Notifications</Heading>
        <BodyText>{text}</BodyText>
        {failed && (
          <ErrorMessage>Notifications could not be turned on. Try again.</ErrorMessage>
        )}
        {offer && (
          <Group>
            <Button onClick={onEnable} loading={busy}>
              Enable notifications
            </Button>
          </Group>
        )}
      </Stack>
    </BaseCard>
  );
}
