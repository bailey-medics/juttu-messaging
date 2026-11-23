import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { listMyConversations, type HomeConversation } from "@/api/conversations";

import { UnreadBadge } from "@/components/badge";
import DataTable from "@/components/tables/DataTable";
import { PageHeader } from "@/components/typography";
import { useLiveCards, useLiveMessages } from "@/live/LiveContext";

import { apiFailure } from "./apiFailure";

/**
 * The first page, titled "Conversations": every conversation the person
 * may read, most recently active first. Notifications are set on the
 * Settings page, and a lost connection shows in the layout's strip.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<HomeConversation[] | null>(null);
  const [conversationsFailed, setConversationsFailed] = useState<string | null>(null);

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

  return (
    <Stack gap="lg">
      <PageHeader title="Conversations" />
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
    </Stack>
  );
}
