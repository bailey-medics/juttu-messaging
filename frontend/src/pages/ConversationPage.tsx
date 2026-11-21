import { Box, SimpleGrid, Stack } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";

import { listCards, type LivingCard } from "@/api/cards";
import { ApiError, isRecord } from "@/api/client";
import {
  listMessages,
  listReplies,
  markRead,
  sendMessage,
  type ChatMessage,
} from "@/api/conversations";
import { useAuth } from "@/auth/AuthContext";
import { LivingCardView } from "@/components/cards";
import NotFoundLayout from "@/components/layouts/NotFoundLayout";
import { Messaging, ThreadPanel, type Message } from "@/components/messaging";
import { usePageMessage } from "@/components/page-message";
import { PageHeader } from "@/components/typography";
import { useLiveCards, useLiveMessages } from "@/live/LiveContext";
import { useLooking } from "@/live/useLooking";

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

/**
 * *list* with *message* on the end, unless it is there already: a message
 * the person sent arrives both as the answer to sending it and live.
 */
function withMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return list.some((m) => m.id === message.id) ? list : [...list, message];
}

/** *list* with *card* as it now stands, in place, or on the end if new. */
function withCard(list: LivingCard[], card: LivingCard): LivingCard[] {
  return list.some((c) => c.id === card.id)
    ? list.map((c) => (c.id === card.id ? card : c))
    : [...list, card];
}

/** A card, in the shape `Messaging` draws in a message's place. */
function cardForMessaging(card: LivingCard): Message {
  return {
    id: `card-${card.id}`,
    senderId: "",
    text: "",
    timestamp: card.created_at,
    card: <LivingCardView card={card} />,
  };
}

/**
 * The messages and cards together, by when each was made. Both times are
 * the backend's, written the same way, so they sort as text.
 */
function timeline(messages: ChatMessage[], cards: LivingCard[]): Message[] {
  const drawn = [
    ...messages.map((m) => ({ at: m.created_at, item: forMessaging(m, true) })),
    ...cards.map((c) => ({ at: c.created_at, item: cardForMessaging(c) })),
  ];

  return drawn.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).map((d) => d.item);
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
 * messages, its living cards among them by when each was made, and the box
 * to write one. Messages and cards load when the page opens, and change
 * live: new messages, replies in an open thread, and cards in place. A conversation the
 * person cannot read shows "Page not found", as the backend answers.
 */
export default function ConversationPage() {
  const { conversationId } = useParams();
  const id = Number(conversationId);
  const location = useLocation();
  const { state } = useAuth();
  const { showMessage } = usePageMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cards, setCards] = useState<LivingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  // Replies already counted in their message's "N replies", so one that
  // arrives both live and as the answer to sending it counts once.
  const counted = useRef(new Set<number>());

  const currentUserId = state.status === "authenticated" ? String(state.user.id) : "";

  const load = useCallback(async () => {
    try {
      const found = await listMessages(id);
      setMessages(found);
      markSeen(id, found);
      // Cards only add to the page, so one that fails to load is left out.
      listCards(id)
        .then(setCards)
        .catch(() => setCards([]));
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

  const countReply = useCallback((sent: ChatMessage) => {
    if (sent.thread === null || counted.current.has(sent.id)) {
      return;
    }

    counted.current.add(sent.id);
    setMessages((current) =>
      current.map((m) => (m.id === sent.thread ? { ...m, reply_count: m.reply_count + 1 } : m)),
    );
  }, []);

  // Nobody is sent a push about the conversation they are looking at.
  useLooking(id);

  useLiveCards(({ conversation, card }) => {
    if (conversation === id) {
      setCards((current) => withCard(current, card));
    }
  });

  useLiveMessages(({ conversation, message }) => {
    if (conversation !== id) {
      return;
    }

    if (message.thread === null) {
      setMessages((current) => withMessage(current, message));
    } else {
      countReply(message);
      if (message.thread === threadId) {
        setReplies((current) => withMessage(current, message));
      }
    }

    markSeen(id, [message]);
  });

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
      setReplies((current) => withMessage(current, sent));
      countReply(sent);
    } catch (failure) {
      showMessage({ variant: "error", title: `Not sent. ${apiFailure(failure)}` });
    }
  }

  const root = messages.find((m) => m.id === threadId);

  async function send(text: string) {
    try {
      const sent = await sendMessage(id, text);
      setMessages((current) => withMessage(current, sent));
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
            messages={timeline(messages, cards)}
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
