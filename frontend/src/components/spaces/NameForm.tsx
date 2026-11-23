/**
 * A form asking for one name, such as a new space's or a new channel's.
 * Built from `Form` and `TextField`.
 */

import { Stack } from "@mantine/core";

import { TextField } from "@/components/form";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";

export interface NameFormProps {
  /** The field's label, such as "Space name". */
  label: string;
  /** The button's label, such as "Make space". */
  submitLabel: string;
  /** The most characters the backend takes. */
  maxLength: number;
  /** Called with the name, trimmed; says whether it worked. */
  onSubmit: (name: string) => Promise<FormSubmitResult>;
}

interface NameFormData {
  name: string;
}

function NameField({ label, maxLength }: { label: string; maxLength: number }) {
  const { methods } = useFormContext<NameFormData>();

  return (
    <Stack>
      <TextField
        label={label}
        maxLength={maxLength}
        {...methods.register("name", { required: true, validate: (v) => v.trim() !== "" })}
        required
        autoComplete="off"
      />
      <FormStatusNarrow />
      <SubmitButton />
    </Stack>
  );
}

export default function NameForm({ label, submitLabel, maxLength, onSubmit }: NameFormProps) {
  return (
    <Form<NameFormData>
      defaultValues={{ name: "" }}
      onSubmit={async (data) => onSubmit(data.name.trim())}
      submitLabel={submitLabel}
      // The page moves on once the thing is made, which the unsaved-changes
      // guard would stop with "Leave this page?". One field is little to lose.
      blockNavigation={false}
    >
      <NameField label={label} maxLength={maxLength} />
    </Form>
  );
}
