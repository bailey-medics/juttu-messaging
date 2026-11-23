import { Button, Group, Radio, Stack } from "@mantine/core";

import type { NotifyLevel } from "@/api/push";

import BaseCard from "@/components/base-card/BaseCard";
import { BodyText, ErrorMessage, Heading } from "@/components/typography";
import type { PushState } from "@/pwa/push";

/** The choices of what notifies the person, quiet first as the default. */
const LEVELS: { value: NotifyLevel; label: string; description: string }[] = [
  {
    value: "quiet",
    label: "Direct messages and mentions",
    description: "Everything else waits until you open Juttu. The default.",
  },
  {
    value: "everything",
    label: "Every message",
    description: "In every conversation you are in.",
  },
  { value: "nothing", label: "Nothing", description: "No notifications on any device." },
];

function isLevel(value: string): value is NotifyLevel {
  return LEVELS.some((level) => level.value === value);
}

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
  /** What notifies the person, on every device, or null while it loads. */
  level?: NotifyLevel | null;
  onLevelChange?: (level: NotifyLevel) => void;
  /** The last choice of level did not save. */
  levelFailed?: boolean;
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
  level = null,
  onLevelChange,
  levelFailed = false,
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
        {level !== null && (
          <Radio.Group
            label="Notify me about"
            value={level}
            onChange={(value) => {
              if (isLevel(value)) {
                onLevelChange?.(value);
              }
            }}
          >
            <Stack gap="xs" mt="xs">
              {LEVELS.map((choice) => (
                <Radio
                  key={choice.value}
                  value={choice.value}
                  label={choice.label}
                  description={choice.description}
                />
              ))}
            </Stack>
          </Radio.Group>
        )}
        {levelFailed && <ErrorMessage>Your choice was not saved. Try again.</ErrorMessage>}
      </Stack>
    </BaseCard>
  );
}
