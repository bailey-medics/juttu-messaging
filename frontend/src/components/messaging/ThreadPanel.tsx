/**
 * One thread, beside its conversation: the message it hangs off, its
 * replies, and a box to reply. Composed from `Messaging`, `Heading` and
 * `IconButton`; nothing is drawn from scratch.
 */

import { Group, Stack } from "@mantine/core";

import IconButton from "@/components/button/IconButton";
import { IconX } from "@/components/icons/appIcons";
import BaseCard from "@/components/base-card/BaseCard";
import { Heading } from "@/components/typography";

import Messaging, { type Message } from "./Messaging";

export interface ThreadPanelProps {
  /** The top-level message, then its replies, oldest first. */
  messages: Message[];
  currentUserId: string;
  onReply: (text: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ThreadPanel({
  messages,
  currentUserId,
  onReply,
  onClose,
  isLoading = false,
}: ThreadPanelProps) {
  return (
    <BaseCard>
      <Stack gap="sm" mih="20rem">
        <Group justify="space-between" wrap="nowrap">
          <Heading>Thread</Heading>
          <IconButton icon={<IconX />} aria-label="Close the thread" onClick={onClose} />
        </Group>
        <Messaging
          messages={messages}
          currentUserId={currentUserId}
          onSend={onReply}
          isLoading={isLoading}
          placeholder="Reply in the thread"
        />
      </Stack>
    </BaseCard>
  );
}
