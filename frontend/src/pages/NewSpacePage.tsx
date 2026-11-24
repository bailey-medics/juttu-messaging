import { Stack } from "@mantine/core";
import { useNavigate } from "react-router";

import { createSpace, type SpaceKind } from "@/api/spaces";
import type { FormSubmitResult } from "@/components/form/Form";
import { NewSpaceForm } from "@/components/spaces";
import { PageHeader } from "@/components/typography";

import { apiFailure } from "./apiFailure";

/** Make a space, with its name and kind, at `/spaces/new`, for an organisation admin. */
export default function NewSpacePage() {
  const navigate = useNavigate();

  async function handleSubmit(name: string, kind: SpaceKind): Promise<FormSubmitResult> {
    try {
      const space = await createSpace(name, kind);

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
      <NewSpaceForm onSubmit={handleSubmit} />
    </Stack>
  );
}
