import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  listMyConversations,
  type HomeConversation,
  type ShownPerson,
} from "@/api/conversations";

import { IconAlertCircle, IconMessage } from "@/components/icons/appIcons";
import StateMessage from "@/components/message-cards/StateMessage";
import { MessagesList, type MessageThread } from "@/components/messaging";
import { ConversationIcon, type StackedParticipant } from "@/components/profile-pic";
import { AVATAR_GRADIENTS } from "@/components/profile-pic/gradients";
import { Heading, PageHeader } from "@/components/typography";
import { useLiveCards, useLiveMessages } from "@/live/LiveContext";

import { apiFailure } from "./apiFailure";
import { groupBySpace } from "./homeGroups";

/**
 * The first page, titled "Conversations": every conversation the person
 * may read, under its space's name, as Quill Medical lists patient
 * conversations. Spaces come Dev, then Personal, then Clinical, and each
 * space's conversations most recently active first. Each row shows the
 * other people's initials, or the conversation's own icon, then its newest
 * message or card change. Notifications are set on the Settings page.
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

  /** One conversation, as a row of `MessagesList`. */
  function asThread(conversation: HomeConversation): MessageThread {
    return {
      id: String(conversation.id),
      displayName: conversation.title,
      profiles: conversation.people.map(asParticipant),
      lastMessage: conversation.last_item?.text ?? "No messages yet",
      lastMessageTime: conversation.last_item?.at ?? conversation.last_active_at,
      unreadCount: conversation.unread_count,
      // No people to draw: too many of them, or its circles turned off.
      icon:
        conversation.people.length === 0 ? (
          <ConversationIcon
            icon={conversation.icon}
            colour={conversation.icon_colour}
            label={conversation.title}
            src={conversation.icon_url}
            size="lg"
          />
        ) : undefined,
    };
  }

  function openThread(thread: MessageThread) {
    const chosen = conversations?.find((c) => String(c.id) === thread.id);

    if (chosen !== undefined) {
      open(chosen);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader title="Conversations" />
      {conversationsFailed !== null ? (
        <StateMessage
          icon={<IconAlertCircle />}
          title="Your conversations could not be loaded"
          description={conversationsFailed}
          colour="alert"
        />
      ) : conversations === null ? (
        <MessagesList threads={[]} isLoading onThreadClick={() => {}} />
      ) : conversations.length === 0 ? (
        <StateMessage
          icon={<IconMessage />}
          title="No conversations yet"
          description="Once an admin adds you to a space, its channels show here."
          colour="info"
        />
      ) : (
        groupBySpace(conversations).map((group) => (
          <Stack key={group.space.id} gap="sm">
            <Heading>{group.space.name}</Heading>
            <MessagesList
              threads={group.conversations.map(asThread)}
              onThreadClick={openThread}
            />
          </Stack>
        ))
      )}
    </Stack>
  );
}

/** One person Home draws, as `ProfilePic` takes a name: their first word, then the rest. */
function asParticipant(person: ShownPerson): StackedParticipant {
  const [givenName = "", ...rest] = person.name.trim().split(/\s+/);

  return {
    givenName,
    familyName: rest.join(" ") || undefined,
    // From the person's id, so the same person keeps the same colour everywhere.
    gradientIndex: person.id % AVATAR_GRADIENTS.length,
  };
}
