import { SimpleGrid, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect, useState } from "react";

import { getNotifyLevel, setNotifyLevel, type NotifyLevel } from "@/api/push";
import { getSpaceOrder, setSpaceOrder, type Space } from "@/api/spaces";
import ActionCard from "@/components/action-card";
import { IconDownload } from "@/components/icons/appIcons";
import { InstallAppModal } from "@/components/install-app-modal";
import { NotificationsCard } from "@/components/notifications";
import { SpaceOrderCard } from "@/components/spaces";
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
 * device shows notifications, the person's own order of their spaces on
 * the Conversations page, and installing Juttu as an app.
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
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [orderFailed, setOrderFailed] = useState(false);

  useEffect(() => {
    getSpaceOrder()
      .then(setSpaces)
      .catch(() => setSpaces([]));
  }, []);

  /** Move one space up or down, saving at once; put it back if it fails. */
  async function moveSpace(index: number, step: -1 | 1) {
    if (spaces === null) {
      return;
    }

    const before = spaces;
    const after = movedBy(spaces, index, step);
    setSpaces(after);
    setOrderFailed(false);

    try {
      setSpaces(await setSpaceOrder(after.map((space) => space.id)));
    } catch {
      setSpaces(before);
      setOrderFailed(true);
    }
  }

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
        <SpaceOrderCard
          spaces={spaces}
          onMove={(index, step) => void moveSpace(index, step)}
          failed={orderFailed}
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

/** *list* with the item at *index* moved one place by *step*, -1 up or 1 down. */
function movedBy<T>(list: readonly T[], index: number, step: -1 | 1): T[] {
  const target = index + step;

  if (target < 0 || target >= list.length) {
    return [...list];
  }

  const moved = [...list];
  [moved[index], moved[target]] = [moved[target]!, moved[index]!];

  return moved;
}
