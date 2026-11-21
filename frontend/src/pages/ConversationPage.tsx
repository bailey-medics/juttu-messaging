import { Box, SimpleGrid, Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";

import { ApiError, isRecord } from "@/api/client";
import {
  listMessages,
  listReplies,
  markRead,
  sendMessage,
  type ChatMessage,
} from "@/api/conversations";
import { useAuth } from "@/auth/AuthContext";
import NotFoundLayout from "@/components/layouts/NotFoundLayout";
import { Messaging, ThreadPanel, type Message } from "@/components/messaging";
import { usePageMessage } from "@/components/page-message";
import { PageHeader } from "@/components/typography";

import { apiFailure } from "./apiFailure";

/** The conversation's title, as the page that linked here passed it on. */
function titleFrom(state: unknown): string {
  return isRecord(state) && typeof state.title === "string" ? state.title : "Conversation";
}

/**
 * Say the person has seen these messages, by the newest of them. A failure
 * only leaves them counted as unread, so it is not shown.
 */
function markSeen(conversationId: number, seen: ChatMessage[]) {
  const newest = Math.max(0, ...seen.map((m) => m.id));

  if (newest > 0) {
    markRead(conversationId, newest).catch(() => {});
  }
}

/** The action that opens a message's thread. */
const OPEN_THREAD = "open-thread";

/** "Reply", or how many replies there are, as a message's thread button says. */
function repliesLabel(count: number): string {
  if (count === 0) {
    return "Reply";
  }

  return count === 1 ? "1 reply" : `${count} replies`;
}

/**
 * One message, in the shape `Messaging` draws. A top-level message gets
 * the button that opens its thread; a reply in a thread does not.
 */
function forMessaging(message: ChatMessage, withThread: boolean): Message {
  return {
    id: String(message.id),
    senderId: String(message.author.id),
    senderName: message.author.name,
    text: message.amends === null ? message.body : `${message.body} (correction)`,
    timestamp: message.created_at,
    actions: withThread
      ? [{ label: repliesLabel(message.reply_count), value: OPEN_THREAD, variant: "light" }]
      : undefined,
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
  const [threadId, setThreadId] = useState<number | null>(null);
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const currentUserId = state.status === "authenticated" ? String(state.user.id) : "";

  const load = useCallback(async () => {
    try {
      const found = await listMessages(id);
      setMessages(found);
      markSeen(id, found);
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

  async function openThread(messageId: number) {
    setThreadId(messageId);
    setReplies([]);
    setRepliesLoading(true);

    try {
      const found = await listReplies(messageId);
      setReplies(found);
      markSeen(id, found);
    } catch (failure) {
      showMessage({ variant: "error", title: apiFailure(failure) });
    } finally {
      setRepliesLoading(false);
    }
  }

  async function reply(text: string) {
    if (threadId === null) {
      return;
    }

    try {
      const sent = await sendMessage(id, text, threadId);
      setReplies((current) => [...current, sent]);
      setMessages((current) =>
        current.map((m) => (m.id === threadId ? { ...m, reply_count: m.reply_count + 1 } : m)),
      );
    } catch (failure) {
      showMessage({ variant: "error", title: `Not sent. ${apiFailure(failure)}` });
    }
  }

  const root = messages.find((m) => m.id === threadId);

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
      {/* The thread sits beside the conversation on a wide screen, and
          beneath it on a phone. */}
      <SimpleGrid cols={{ base: 1, md: threadId === null ? 1 : 2 }} spacing="md">
        <Box mih="20rem">
          <Messaging
            messages={messages.map((m) => forMessaging(m, true))}
            currentUserId={currentUserId}
            onSend={(text) => void send(text)}
            onAction={(messageId, action) => {
              if (action === OPEN_THREAD) {
                void openThread(Number(messageId));
              }
            }}
            isLoading={loading}
            placeholder="Write a message"
          />
        </Box>
        {threadId !== null && (
          <ThreadPanel
            messages={[...(root ? [root] : []), ...replies].map((m) => forMessaging(m, false))}
            currentUserId={currentUserId}
            onReply={(text) => void reply(text)}
            onClose={() => setThreadId(null)}
            isLoading={repliesLoading}
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}
