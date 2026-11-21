import { Badge, Group, Text } from "@mantine/core";

/** Where the health check has got to. */
export type HealthState = "checking" | "up" | "down";

export interface HealthStatusProps {
  state: HealthState;
}

const LABELS: Record<HealthState, { colour: string; label: string; detail: string }> = {
  checking: {
    colour: "gray",
    label: "Checking",
    detail: "Asking the backend whether it is up.",
  },
  up: {
    colour: "primary",
    label: "Backend up",
    detail: "The backend answered its health check.",
  },
  down: {
    colour: "red",
    label: "Backend down",
    detail: "The backend did not answer its health check.",
  },
};

/** Shows whether the backend answered its health check. */
export default function HealthStatus({ state }: HealthStatusProps) {
  const { colour, label, detail } = LABELS[state];

  return (
    <Group gap="sm" role="status" aria-live="polite">
      <Badge color={colour} size="lg">
        {label}
      </Badge>
      <Text>{detail}</Text>
    </Group>
  );
}
