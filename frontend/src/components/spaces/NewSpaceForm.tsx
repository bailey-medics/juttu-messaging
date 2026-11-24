/**
 * The form an organisation admin fills in to make a space: its name, and
 * its kind, Dev, Personal or Clinical. Built from `Form`, `TextField` and
 * `RadioField`. A kind is fixed once the space is made.
 */

import { Stack } from "@mantine/core";
import { Controller } from "react-hook-form";

import { isSpaceKind, SPACE_KINDS, type SpaceKind } from "@/api/spaces";
import { TextField } from "@/components/form";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";
import RadioField from "@/components/form/RadioField";

/** The longest space name the backend takes. */
export const MAX_SPACE_NAME = 100;

/** What each kind is for, under the choice. */
const KIND_HELP: Record<SpaceKind, string> = {
  dev: "Dev is for building and running software.",
  personal: "Personal is for anything outside work.",
  clinical:
    "Clinical is for patient care. Juttu holds no patient details yet, so do not type any.",
};

export interface NewSpaceFormProps {
  /** Called with the name, trimmed, and the chosen kind; says whether it worked. */
  onSubmit: (name: string, kind: SpaceKind) => Promise<FormSubmitResult>;
}

interface NewSpaceData {
  name: string;
  kind: SpaceKind;
}

function NewSpaceFields() {
  const { methods } = useFormContext<NewSpaceData>();

  return (
    <Stack>
      <TextField
        label="Space name"
        maxLength={MAX_SPACE_NAME}
        {...methods.register("name", { required: true, validate: (v) => v.trim() !== "" })}
        required
        autoComplete="off"
      />
      <Controller
        name="kind"
        control={methods.control}
        render={({ field }) => (
          <RadioField
            label="Kind"
            description={`${KIND_HELP[field.value]} A space's kind cannot be changed once it is made.`}
            options={SPACE_KINDS.map((kind) => ({ value: kind.value, label: kind.label }))}
            value={field.value}
            onChange={(value) => {
              if (isSpaceKind(value)) {
                field.onChange(value);
              }
            }}
            required
          />
        )}
      />
      <FormStatusNarrow />
      <SubmitButton />
    </Stack>
  );
}

export default function NewSpaceForm({ onSubmit }: NewSpaceFormProps) {
  return (
    <Form<NewSpaceData>
      defaultValues={{ name: "", kind: "dev" }}
      onSubmit={async (data) => onSubmit(data.name.trim(), data.kind)}
      submitLabel="Make space"
      // The page moves on once the space is made, which the unsaved-changes
      // guard would stop with "Leave this page?". Two fields are little to lose.
      blockNavigation={false}
    >
      <NewSpaceFields />
    </Form>
  );
}
