/**
 * The sign-in form: a username, a password and a "Sign in" button, in a
 * card. Ported from Quill Medical's `LoginForm`, without its two-factor
 * code, register link, forgotten password link and logo, none of which
 * Juttu has yet.
 */

import { Stack } from "@mantine/core";

import BaseCard from "@/components/base-card/BaseCard";
import { PasswordField, TextField } from "@/components/form";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";
import PageHeader from "@/components/page-header";
import { MAX_PASSWORD, MAX_USERNAME } from "@/lib/fieldLimits";

export interface SignInFormData {
  username: string;
  password: string;
}

export interface SignInFormProps {
  /** Called with what was typed; says whether signing in worked. */
  onSubmit: (data: SignInFormData) => Promise<FormSubmitResult>;
  /** The heading above the fields. */
  title?: string;
}

function SignInFields({ title }: { title: string }) {
  const { methods } = useFormContext<SignInFormData>();

  return (
    <Stack>
      <PageHeader title={title} />
      <TextField
        label="Username"
        maxLength={MAX_USERNAME}
        {...methods.register("username", { required: true })}
        required
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
      />
      <PasswordField
        label="Password"
        maxLength={MAX_PASSWORD}
        {...methods.register("password", { required: true })}
        required
        autoComplete="current-password"
      />
      <FormStatusNarrow />
      <SubmitButton />
    </Stack>
  );
}

export default function SignInForm({ onSubmit, title = "Sign in to Juttu" }: SignInFormProps) {
  async function handleSubmit(data: SignInFormData): Promise<FormSubmitResult> {
    return onSubmit({ username: data.username.trim(), password: data.password });
  }

  return (
    <BaseCard maw={380} mx="auto" mt="xl">
      <Form<SignInFormData>
        defaultValues={{ username: "", password: "" }}
        onSubmit={handleSubmit}
        submitLabel="Sign in"
        submittingLabel="Signing in…"
        blockNavigation={false}
      >
        <SignInFields title={title} />
      </Form>
    </BaseCard>
  );
}
