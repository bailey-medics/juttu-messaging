/**
 * Choose a member of the organisation to put in a space. Built from `Form`
 * and `SelectField`.
 */

import { Stack } from "@mantine/core";
import { Controller } from "react-hook-form";

import SelectField from "@/components/form/SelectField";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";

export interface PersonChoice {
  /** The person's id, as text, which `SelectField` needs. */
  value: string;
  label: string;
}

export interface AddToSpaceFormProps {
  /** The people who can be added: in the organisation, not yet in the space. */
  people: PersonChoice[];
  /** Called with the chosen person's id; says whether it worked. */
  onSubmit: (userId: number) => Promise<FormSubmitResult>;
}

interface AddToSpaceData {
  userId: string;
}

function PersonField({ people }: { people: PersonChoice[] }) {
  const { methods } = useFormContext<AddToSpaceData>();

  return (
    <Stack>
      <Controller
        name="userId"
        control={methods.control}
        rules={{ required: true }}
        render={({ field }) => (
          <SelectField
            label="Person"
            placeholder={people.length === 0 ? "Everybody is in this space" : "Choose a person"}
            data={people}
            value={field.value === "" ? null : field.value}
            onChange={(value) => field.onChange(value ?? "")}
            searchable
            required
            disabled={people.length === 0}
          />
        )}
      />
      <FormStatusNarrow />
      <SubmitButton />
    </Stack>
  );
}

export default function AddToSpaceForm({ people, onSubmit }: AddToSpaceFormProps) {
  return (
    <Form<AddToSpaceData>
      defaultValues={{ userId: "" }}
      onSubmit={async (data) => onSubmit(Number(data.userId))}
      submitLabel="Add to space"
      submittingLabel="Adding…"
      blockNavigation={false}
    >
      <PersonField people={people} />
    </Form>
  );
}
