/**
 * The form an organisation admin fills in to register a sender: its name,
 * and the channel its cards land in. Built from `Form`, `TextField` and
 * `SelectField`.
 */

import { Stack } from "@mantine/core";
import { Controller } from "react-hook-form";

import type { SenderChannel } from "@/api/senders";
import { SelectField, TextField } from "@/components/form";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";

/** The longest sender name the backend takes. */
export const MAX_SENDER_NAME = 100;

export interface RegisterSenderFormProps {
  /** Every channel in the organisation. */
  channels: SenderChannel[];
  /** Called with the name and the chosen channel's id. */
  onSubmit: (name: string, channelId: number) => Promise<FormSubmitResult>;
}

interface RegisterSenderData {
  name: string;
  channelId: string;
}

function RegisterSenderFields({ channels }: { channels: SenderChannel[] }) {
  const { methods } = useFormContext<RegisterSenderData>();
  const choices = channels.map((c) => ({
    value: String(c.id),
    label: `${c.space.name} / ${c.name}`,
  }));

  return (
    <Stack>
      <TextField
        label="Name"
        description="What the sender is, such as Deploys."
        maxLength={MAX_SENDER_NAME}
        {...methods.register("name", { required: true })}
        required
        autoComplete="off"
      />
      <Controller
        name="channelId"
        control={methods.control}
        rules={{ required: true }}
        render={({ field }) => (
          <SelectField
            label="Channel"
            description="Where its cards appear. Everybody in the channel can see them."
            placeholder={
              channels.length === 0 ? "Open a channel in a space first" : "Choose a channel"
            }
            data={choices}
            value={field.value === "" ? null : field.value}
            onChange={(value) => field.onChange(value ?? "")}
            searchable
            required
            disabled={channels.length === 0}
          />
        )}
      />
      <FormStatusNarrow />
      <SubmitButton />
    </Stack>
  );
}

export default function RegisterSenderForm({ channels, onSubmit }: RegisterSenderFormProps) {
  return (
    <Form<RegisterSenderData>
      defaultValues={{ name: "", channelId: "" }}
      onSubmit={async (data) => onSubmit(data.name.trim(), Number(data.channelId))}
      submitLabel="Register sender"
      submittingLabel="Registering…"
      // The page shows the secret once the sender is registered, which the
      // unsaved-changes guard would otherwise get in the way of.
      blockNavigation={false}
    >
      <RegisterSenderFields channels={channels} />
    </Form>
  );
}
