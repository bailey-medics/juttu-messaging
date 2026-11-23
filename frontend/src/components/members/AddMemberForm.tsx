/**
 * The form an organisation admin fills in to add a person: their name,
 * username and password. The admin tells them the password; nothing is
 * emailed. Built from `Form` and Juttu's fields.
 */

import { Stack } from "@mantine/core";

import { PasswordField, TextField } from "@/components/form";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";
import { MAX_NAME, MAX_PASSWORD, MAX_USERNAME } from "@/lib/fieldLimits";

export interface AddMemberFormData {
  name: string;
  username: string;
  password: string;
}

export interface AddMemberFormProps {
  /** Called with what was typed; says whether the person was added. */
  onSubmit: (data: AddMemberFormData) => Promise<FormSubmitResult>;
}

function AddMemberFields() {
  const { methods } = useFormContext<AddMemberFormData>();

  return (
    <Stack>
      <TextField
        label="Name"
        maxLength={MAX_NAME}
        {...methods.register("name", { required: true })}
        required
        autoComplete="off"
      />
      <TextField
        label="Username"
        description="What they type to sign in."
        maxLength={MAX_USERNAME}
        {...methods.register("username", { required: true })}
        required
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <PasswordField
        label="Password"
        description="At least 15 characters. Tell them it yourself: nothing is emailed."
        maxLength={MAX_PASSWORD}
        {...methods.register("password", { required: true })}
        required
        autoComplete="new-password"
      />
      <FormStatusNarrow />
      <SubmitButton />
    </Stack>
  );
}

export default function AddMemberForm({ onSubmit }: AddMemberFormProps) {
  async function handleSubmit(data: AddMemberFormData): Promise<FormSubmitResult> {
    return onSubmit({
      name: data.name.trim(),
      username: data.username.trim(),
      password: data.password,
    });
  }

  return (
    <Form<AddMemberFormData>
      defaultValues={{ name: "", username: "", password: "" }}
      onSubmit={handleSubmit}
      submitLabel="Add member"
      submittingLabel="Adding…"
      // The page moves on to the members list once the person is added,
      // which the unsaved-changes guard would otherwise stop with "Leave
      // this page?". Three short fields are little to lose.
      blockNavigation={false}
    >
      <AddMemberFields />
    </Form>
  );
}
