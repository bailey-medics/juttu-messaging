/**
 * A new sender's secret, shown once, with what to do with it. Juttu keeps
 * only a hash of it, so once this is gone nobody can see it again. Built
 * from `BaseCard`, `TextField` and the typography components.
 */

import { Button, Group, Stack } from "@mantine/core";

import BaseCard from "@/components/base-card/BaseCard";
import { TextField } from "@/components/form";
import { BodyText, Heading } from "@/components/typography";

/** The line in the box's settings file that the deploy script reads. */
export const SECRET_SETTING = "JUTTU_BOX_INLET_SECRET";

export interface SenderSecretProps {
  /** The sender's name, as registered. */
  name: string;
  secret: string;
  /** Called when the admin has copied it, and is done with this page. */
  onDone: () => void;
}

export default function SenderSecret({ name, secret, onDone }: SenderSecretProps) {
  return (
    <BaseCard>
      <Stack>
        <Heading>{`${name} is registered`}</Heading>
        <BodyText>
          Copy its secret now. Juttu cannot show it again, because it keeps only a scrambled
          copy.
        </BodyText>
        <TextField
          label="Secret"
          value={secret}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          spellCheck={false}
        />
        <BodyText>
          {`For the box's deploy script, paste it into local/box.env as one line: ${SECRET_SETTING}=<the secret>.`}
        </BodyText>
        <Group justify="flex-end">
          <Button onClick={onDone}>Done</Button>
        </Group>
      </Stack>
    </BaseCard>
  );
}
