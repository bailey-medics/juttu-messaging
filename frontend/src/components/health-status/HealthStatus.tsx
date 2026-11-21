import { Badge, Group } from "@mantine/core";

import { BADGE_VARIANT, badgeColours } from "@/components/badge/badgeColours";
import LiveStatus from "@/components/live-status";
import { BodyText } from "@/components/typography";

/** Where the health check has got to. */
export type HealthState = "checking" | "up" | "down";

export interface HealthStatusProps {
  state: HealthState;
}

/** The pale "not yet" wash and its near-black text, for a check under way. */
const CHECKING_COLOURS = { bg: "var(--update-color)", text: "var(--status-text-dark)" };

/**
 * Each state's badge: Quill Medical's `success` and `alert` badge colours,
 * which take white text at WCAG AA, and the "not yet" wash while checking.
 */
const STATES: Record<
  HealthState,
  { colours: { bg: string; text: string }; label: string; detail: string }
> = {
  checking: {
    colours: CHECKING_COLOURS,
    label: "Checking",
    detail: "Asking the backend whether it is up.",
  },
  up: {
    colours: badgeColours.success,
    label: "Backend up",
    detail: "The backend answered its health check.",
  },
  down: {
    colours: badgeColours.alert,
    label: "Backend down",
    detail: "The backend did not answer its health check.",
  },
};

/**
 * Shows whether the backend answered its health check, and tells a screen
 * reader when that changes, through `LiveStatus`.
 */
export default function HealthStatus({ state }: HealthStatusProps) {
  const { colours, label, detail } = STATES[state];

  return (
    <>
      <Group gap="sm">
        <Badge variant={BADGE_VARIANT} color={colours.bg} c={colours.text} size="lg">
          {label}
        </Badge>
        <BodyText>{detail}</BodyText>
      </Group>
      <LiveStatus message={`${label}. ${detail}`} />
    </>
  );
}
