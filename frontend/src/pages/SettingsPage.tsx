import { SimpleGrid, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect, useState } from "react";

import { getNotifyLevel, setNotifyLevel, type NotifyLevel } from "@/api/push";
import ActionCard from "@/components/action-card";
import { IconDownload } from "@/components/icons/appIcons";
import { InstallAppModal } from "@/components/install-app-modal";
import { NotificationsCard } from "@/components/notifications";
import { PageHeader } from "@/components/typography";
import { browserPush, enablePush, pushState, type PushState } from "@/pwa/push";
import type { InstallEnvironment } from "@/pwa/installRoute";
import type { InstallPromptCapture } from "@/pwa/installPrompt";
import { useInstallRoute } from "@/pwa/useInstallRoute";

export interface SettingsPageProps {
  /** The install prompt store. Tests and stories pass their own. */
  capture?: InstallPromptCapture;
  /** Reads the browser. Tests and stories pass a fixed environment. */
  readEnvironment?: (hasDeferredPrompt: boolean) => InstallEnvironment;
}

/**
 * The person's settings, at `/settings`, laid out as Quill Medical's
 * Settings page: a card each, two columns on a wide screen. Whether this
 * device shows notifications, and installing Juttu as an app.
 */
export default function SettingsPage({ capture, readEnvironment }: SettingsPageProps) {
  const twoColumns = useMediaQuery("(min-width: 48em)");
  const { route, install } = useInstallRoute(capture, readEnvironment);
  const [installOpen, setInstallOpen] = useState(false);
  const [push, setPush] = useState<PushState | "checking">("checking");
  const [enabling, setEnabling] = useState(false);
  const [failed, setFailed] = useState(false);
  const [level, setLevel] = useState<NotifyLevel | null>(null);
  const [levelFailed, setLevelFailed] = useState(false);

  useEffect(() => {
    pushState(browserPush)
      .then(setPush)
      .catch(() => setPush("unsupported"));
    getNotifyLevel()
      .then(setLevel)
      .catch(() => setLevel(null));
  }, []);

  async function changeLevel(chosen: NotifyLevel) {
    const before = level;
    setLevel(chosen);
    setLevelFailed(false);

    try {
      setLevel(await setNotifyLevel(chosen));
    } catch {
      setLevel(before);
      setLevelFailed(true);
    }
  }

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

  function startInstall() {
    // Pressing the button is already the yes, and the browser shows its
    // own confirmation, so no modal asks again first.
    if (route === "prompt") {
      void install();
    } else {
      setInstallOpen(true);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader title="Settings" />
      <SimpleGrid cols={twoColumns ? 2 : 1}>
        <NotificationsCard
          state={push}
          busy={enabling}
          failed={failed}
          onEnable={() => void enable()}
          level={level}
          onLevelChange={(chosen) => void changeLevel(chosen)}
          levelFailed={levelFailed}
        />
        {route !== "installed" && (
          <ActionCard
            icon={<IconDownload />}
            title="Install Juttu"
            subtitle="Open Juttu full screen from its own icon, and get notifications"
            buttonLabel="Install Juttu"
            onClick={startInstall}
          />
        )}
      </SimpleGrid>
      {route !== "installed" && (
        <InstallAppModal
          opened={installOpen}
          route={route}
          onInstall={install}
          onClose={() => setInstallOpen(false)}
        />
      )}
    </Stack>
  );
}
