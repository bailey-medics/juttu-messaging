import { Box, Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";

import { ApiError, isRecord } from "@/api/client";
import { listMessages, sendMessage, type ChatMessage } from "@/api/conversations";
import { useAuth } from "@/auth/AuthContext";
import NotFoundLayout from "@/components/layouts/NotFoundLayout";
import { Messaging, type Message } from "@/components/messaging";
import { usePageMessage } from "@/components/page-message";
import { PageHeader } from "@/components/typography";

import { apiFailure } from "./apiFailure";

/** The conversation's title, as the page that linked here passed it on. */
function titleFrom(state: unknown): string {
  return isRecord(state) && typeof state.title === "string" ? state.title : "Conversation";
}

/** One message, in the shape `Messaging` draws. */
function forMessaging(message: ChatMessage): Message {
  return {
    id: String(message.id),
    senderId: String(message.author.id),
    senderName: message.author.name,
    text: message.amends === null ? message.body : `${message.body} (correction)`,
    timestamp: message.created_at,
  };
}

/**
 * One conversation, at `/conversations/:conversationId`: its latest
 * messages and the box to write one. Messages load when the page opens;
 * live delivery comes with the vision plan's Phase 18. A conversation the
 * person cannot read shows "Page not found", as the backend answers.
 */
export default function ConversationPage() {
  const { conversationId } = useParams();
  const id = Number(conversationId);
  const location = useLocation();
  const { state } = useAuth();
  const { showMessage } = usePageMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const currentUserId = state.status === "authenticated" ? String(state.user.id) : "";

  const load = useCallback(async () => {
    try {
      setMessages(await listMessages(id));
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 404) {
        setMissing(true);
      } else {
        showMessage({ variant: "error", title: apiFailure(failure) });
      }
    } finally {
      setLoading(false);
    }
  }, [id, showMessage]);

  useEffect(() => {
    // The messages load once the page opens; the answer arrives later.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void load();
  }, [load]);

  if (missing || !Number.isInteger(id)) {
    return <NotFoundLayout />;
  }

  async function send(text: string) {
    try {
      const sent = await sendMessage(id, text);
      setMessages((current) => [...current, sent]);
    } catch (failure) {
      showMessage({ variant: "error", title: `Not sent. ${apiFailure(failure)}` });
    }
  }

  return (
    <Stack gap="md" h="100%">
      <PageHeader title={titleFrom(location.state)} />
      <Box mih="20rem" flex={1}>
        <Messaging
          messages={messages.map(forMessaging)}
          currentUserId={currentUserId}
          onSend={(text) => void send(text)}
          isLoading={loading}
          placeholder="Write a message"
        />
      </Box>
    </Stack>
  );
}
