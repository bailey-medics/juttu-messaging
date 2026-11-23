/**
 * A person's own order of their spaces on Home, on the Settings page: each
 * space with "Move up" and "Move down" buttons, which work with a
 * keyboard, a screen reader and a phone. The first can go no higher and
 * the last no lower. Built from `BaseCard`, `IconButton` and the
 * typography components.
 */

import { Group, Stack } from "@mantine/core";

import type { Space } from "@/api/spaces";
import BaseCard from "@/components/base-card/BaseCard";
import IconButton from "@/components/button/IconButton";
import { IconArrowDown, IconArrowUp } from "@/components/icons/appIcons";
import { BodyText, ErrorMessage, Heading } from "@/components/typography";

export interface SpaceOrderCardProps {
  /** The person's spaces, in their order, or null while they load. */
  spaces: Space[] | null;
  /** Move the space at *index* one place up (-1) or down (+1). */
  onMove: (index: number, step: -1 | 1) => void;
  /** The last move did not save, and was put back. */
  failed?: boolean;
}

export default function SpaceOrderCard({
  spaces,
  onMove,
  failed = false,
}: SpaceOrderCardProps) {
  return (
    <BaseCard>
      <Stack gap="sm">
        <Heading>Space order</Heading>
        <BodyText>The order your spaces come in on the Conversations page.</BodyText>
        {spaces === null ? (
          <BodyText>Loading your spaces.</BodyText>
        ) : spaces.length === 0 ? (
          <BodyText>You are not in any spaces yet.</BodyText>
        ) : (
          <Stack gap="xs" component="ol" p={0} m={0}>
            {spaces.map((space, index) => (
              <Group key={space.id} component="li" justify="space-between" wrap="nowrap">
                <BodyText>{space.name}</BodyText>
                <Group gap="xs" wrap="nowrap">
                  <IconButton
                    icon={<IconArrowUp />}
                    aria-label={`Move ${space.name} up`}
                    variant="light"
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  />
                  <IconButton
                    icon={<IconArrowDown />}
                    aria-label={`Move ${space.name} down`}
                    variant="light"
                    disabled={index === spaces.length - 1}
                    onClick={() => onMove(index, 1)}
                  />
                </Group>
              </Group>
            ))}
          </Stack>
        )}
        {failed && <ErrorMessage>That move did not save. Try again.</ErrorMessage>}
      </Stack>
    </BaseCard>
  );
}
