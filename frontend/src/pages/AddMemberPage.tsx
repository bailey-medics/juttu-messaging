import { Stack } from "@mantine/core";
import { useNavigate } from "react-router";

import { addMember } from "@/api/members";
import type { FormSubmitResult } from "@/components/form/Form";
import { AddMemberForm, type AddMemberFormData } from "@/components/members";
import { PageHeader } from "@/components/typography";

import { membersFailure } from "./membersFailure";

/**
 * Add a person, at `/members/new`, for an organisation admin. Once added,
 * the admin goes back to the members, where a message says who was added.
 */
export default function AddMemberPage() {
  const navigate = useNavigate();

  async function handleSubmit(data: AddMemberFormData): Promise<FormSubmitResult> {
    try {
      const added = await addMember(data);

      void navigate("/members", {
        state: { flash: { variant: "success", title: `${added.name} added` } },
      });
    } catch (failure) {
      return { state: "error", message: { title: membersFailure(failure) } };
    }

    return { state: "success", message: { title: "Added" } };
  }

  return (
    <Stack gap="lg">
      <PageHeader title="Add member" />
      <AddMemberForm onSubmit={handleSubmit} />
    </Stack>
  );
}
