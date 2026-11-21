import { Stack } from "@mantine/core";
import { useNavigate } from "react-router";

import { createSpace } from "@/api/spaces";
import type { FormSubmitResult } from "@/components/form/Form";
import { NameForm } from "@/components/spaces";
import { PageHeader } from "@/components/typography";

import { apiFailure } from "./apiFailure";

/** Make a space, at `/spaces/new`, for an organisation admin. */
export default function NewSpacePage() {
  const navigate = useNavigate();

  async function handleSubmit(name: string): Promise<FormSubmitResult> {
    try {
      const space = await createSpace(name);

      void navigate(`/spaces/${space.id}`, {
        state: { flash: { variant: "success", title: `${space.name} made` } },
      });
    } catch (failure) {
      return { state: "error", message: { title: apiFailure(failure) } };
    }

    return { state: "success", message: { title: "Made" } };
  }

  return (
    <Stack gap="lg">
      <PageHeader title="New space" />
      <NameForm
        label="Space name"
        submitLabel="Make space"
        maxLength={100}
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}
