import { Badge, Group } from "@mantine/core";

import { BodyText } from "@/components/typography";

/** Where the health check has got to. */
export type HealthState = "checking" | "up" | "down";

export interface HealthStatusProps {
  state: HealthState;
}

/**
 * Each state's badge, in the theme's status colours: `--success-color` and
 * `--alert-color` take white text at WCAG AA, and `--update-color`, the pale
 * "not yet" wash, takes the near-black `--status-text-dark`.
 */
const LABELS: Record<
  HealthState,
  { colour: string; textColour: string; label: string; detail: string }
> = {
  checking: {
    colour: "var(--update-color)",
    textColour: "var(--status-text-dark)",
    label: "Checking",
    detail: "Asking the backend whether it is up.",
  },
  up: {
    colour: "var(--success-color)",
    textColour: "white",
    label: "Backend up",
    detail: "The backend answered its health check.",
  },
  down: {
    colour: "var(--alert-color)",
    textColour: "white",
    label: "Backend down",
    detail: "The backend did not answer its health check.",
  },
};

/** Shows whether the backend answered its health check. */
export default function HealthStatus({ state }: HealthStatusProps) {
  const { colour, textColour, label, detail } = LABELS[state];

  return (
    <Group gap="sm" role="status" aria-live="polite">
      <Badge color={colour} c={textColour} size="lg">
        {label}
      </Badge>
      <BodyText>{detail}</BodyText>
    </Group>
  );
}
