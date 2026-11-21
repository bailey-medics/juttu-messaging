import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";

import { checkHealth } from "@/api/health";
import BaseCard from "@/components/base-card/BaseCard";
import HealthStatus, { type HealthState } from "@/components/health-status/HealthStatus";
import { NotificationsCard } from "@/components/notifications";
import { BodyText, PageHeader } from "@/components/typography";
import { browserPush, enablePush, pushState, type PushState } from "@/pwa/push";

/**
 * The first page: says what Juttu is, whether its backend is up, and
 * whether this device shows notifications.
 */
export default function HomePage() {
  const [state, setState] = useState<HealthState>("checking");
  const [push, setPush] = useState<PushState | "checking">("checking");
  const [enabling, setEnabling] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pushState(browserPush)
      .then(setPush)
      .catch(() => setPush("unsupported"));
  }, []);

  async function enable() {
    setEnabling(true);
    setFailed(false);

    try {
      setPush(await enablePush(browserPush));
    } catch {
      setFailed(true);
    } finally {
      setEnabling(false);
    }
  }

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
      <NotificationsCard
        state={push}
        busy={enabling}
        failed={failed}
        onEnable={() => void enable()}
      />
    </Stack>
  );
}
