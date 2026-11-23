import { Badge, Button, Group, Stack } from "@mantine/core";
import { useState } from "react";

import type { LivingCard } from "@/api/cards";
import { badgeColours, BADGE_VARIANT } from "@/components/badge/badgeColours";
import BaseCard from "@/components/base-card/BaseCard";
import { BodyText, BodyTextBold } from "@/components/typography";

export interface LivingCardViewProps {
  card: LivingCard;
}

/**
 * One living card in a conversation: where it stands now, and, when asked,
 * the thread of what happened to it. The same for every kind of card; a
 * kind that wants its own look can have one later without changing this.
 */
export default function LivingCardView({ card }: LivingCardViewProps) {
  const [open, setOpen] = useState(false);
  const latest = card.events.at(-1);
  const count = card.events.length;

  return (
    <BaseCard>
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <BodyTextBold>{card.title}</BodyTextBold>
          {card.needs_attention && (
            <Badge
              color={badgeColours.alert.bg}
              c={badgeColours.alert.text}
              variant={BADGE_VARIANT}
            >
              Needs you
            </Badge>
          )}
        </Group>
        {latest && <BodyText>{latest.summary}</BodyText>}
        {count > 1 && (
          <Group>
            <Button variant="subtle" size="compact-sm" onClick={() => setOpen(!open)}>
              {open ? "Hide what happened" : `Show what happened (${count})`}
            </Button>
          </Group>
        )}
        {open && (
          <Stack gap={4} component="ol" aria-label={`What happened to ${card.title}`}>
            {card.events.map((event) => (
              <li key={event.id}>
                <BodyText>{event.summary}</BodyText>
              </li>
            ))}
          </Stack>
        )}
      </Stack>
    </BaseCard>
  );
}
