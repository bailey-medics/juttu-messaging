import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { listMyConversations, type HomeConversation } from "@/api/conversations";

import { checkHealth } from "@/api/health";
import { getNotifyLevel, setNotifyLevel, type NotifyLevel } from "@/api/push";
import { UnreadBadge } from "@/components/badge";
import BaseCard from "@/components/base-card/BaseCard";
import HealthStatus, { type HealthState } from "@/components/health-status/HealthStatus";
import { NotificationsCard } from "@/components/notifications";
import DataTable from "@/components/tables/DataTable";
import { BodyText, Heading, PageHeader } from "@/components/typography";
import { useLiveCards, useLiveMessages } from "@/live/LiveContext";
import { browserPush, enablePush, pushState, type PushState } from "@/pwa/push";

import { apiFailure } from "./apiFailure";

/**
 * The first page: every conversation the person may read, most recently
 * active first, then whether the backend is up and whether this device
 * shows notifications.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<HomeConversation[] | null>(null);
  const [conversationsFailed, setConversationsFailed] = useState<string | null>(null);
  const [state, setState] = useState<HealthState>("checking");
  const [push, setPush] = useState<PushState | "checking">("checking");
  const [enabling, setEnabling] = useState(false);
  const [failed, setFailed] = useState(false);
  const [level, setLevel] = useState<NotifyLevel | null>(null);
  const [levelFailed, setLevelFailed] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await listMyConversations());
      setConversationsFailed(null);
    } catch (failure) {
      setConversationsFailed(apiFailure(failure));
    }
  }, []);

  useEffect(() => {
    // The list loads once the page opens; the answer arrives later.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void loadConversations();
  }, [loadConversations]);

  // Any new message or card changes an unread count and the order, and a
  // message may be the first in a direct conversation just started.
  useLiveMessages(() => void loadConversations());
  useLiveCards(() => void loadConversations());

  function open(conversation: HomeConversation) {
    void navigate(`/conversations/${conversation.id}`, {
      state: { title: conversation.title },
    });
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
      <Heading>Your conversations</Heading>
      <DataTable
        data={conversations ?? []}
        columns={[
          { header: "Name", render: (c) => c.title },
          { header: "Space", render: (c) => c.space.name },
          { header: "Kind", render: (c) => (c.kind === "channel" ? "Channel" : "Direct") },
          { header: "Unread", render: (c) => <UnreadBadge count={c.unread_count} /> },
        ]}
        getRowKey={(c) => c.id}
        onRowClick={open}
        loading={conversations === null && conversationsFailed === null}
        error={conversationsFailed}
        emptyMessage="No conversations yet. Once an admin adds you to a space, its channels show here."
      />
      <BaseCard>
        <HealthStatus state={state} />
      </BaseCard>
      <NotificationsCard
        state={push}
        busy={enabling}
        failed={failed}
        onEnable={() => void enable()}
        level={level}
        onLevelChange={(chosen) => void changeLevel(chosen)}
        levelFailed={levelFailed}
      />
    </Stack>
  );
}
