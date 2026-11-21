import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";

import { checkHealth } from "@/api/health";
import BaseCard from "@/components/base-card/BaseCard";
import HealthStatus, { type HealthState } from "@/components/health-status/HealthStatus";
import { BodyText, PageHeader } from "@/components/typography";

/** The first page: says what Juttu is, and whether its backend is up. */
export default function HomePage() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    checkHealth(controller.signal)
      .then((up) => setState(up ? "up" : "down"))
      .catch(() => {
        // Aborted because the page went away: nothing to show.
      });

    return () => controller.abort();
  }, []);

  return (
    <Stack gap="lg">
      <PageHeader title="Home" />
      <BodyText>A quiet place for a team, its pipeline and its agents to talk.</BodyText>
      <BaseCard>
        <HealthStatus state={state} />
      </BaseCard>
    </Stack>
  );
}
