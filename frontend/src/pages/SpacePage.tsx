import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ApiError } from "@/api/client";
import { listConversations, startChannel, type ConversationSummary } from "@/api/conversations";
import { listMembers, type Member } from "@/api/members";
import {
  addToSpace,
  getSpace,
  listSpaceMembers,
  type Space,
  type SpacePerson,
} from "@/api/spaces";
import { useAuth } from "@/auth/AuthContext";
import type { FormSubmitResult } from "@/components/form/Form";
import PageSpinner from "@/components/loading-spinner/PageSpinner";
import NotFoundLayout from "@/components/layouts/NotFoundLayout";
import { AddToSpaceForm, NameForm } from "@/components/spaces";
import DataTable from "@/components/tables/DataTable";
import { Heading, PageHeader } from "@/components/typography";

import { apiFailure } from "./apiFailure";

/**
 * One space, at `/spaces/:spaceId`: its conversations and who is in it.
 * An organisation admin can open a channel and put people in the space.
 * A space the person is not in shows "Page not found", as the backend
 * answers.
 */
export default function SpacePage() {
  const { spaceId } = useParams();
  const id = Number(spaceId);
  const { state } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [missing, setMissing] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [people, setPeople] = useState<SpacePerson[]>([]);
  const [organisation, setOrganisation] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = state.status === "authenticated" && state.user.is_admin;

  const load = useCallback(async () => {
    try {
      const [found, talks, inSpace] = await Promise.all([
        getSpace(id),
        listConversations(id),
        listSpaceMembers(id),
      ]);
      setSpace(found);
      setConversations(talks);
      setPeople(inSpace);
      setError(null);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 404) {
        setMissing(true);
      } else {
        setError(apiFailure(failure));
      }
    }
  }, [id]);

  useEffect(() => {
    // The space loads once the page opens; the answer arrives later.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) {
      listMembers()
        .then(setOrganisation)
        .catch(() => setOrganisation([]));
    }
  }, [isAdmin]);

  if (missing || !Number.isInteger(id)) {
    return <NotFoundLayout />;
  }

  if (space === null && error === null) {
    return <PageSpinner />;
  }

  async function openChannel(name: string): Promise<FormSubmitResult> {
    try {
      const channel = await startChannel(id, name);
      await load();

      return { state: "success", message: { title: `${channel.title} opened` } };
    } catch (failure) {
      return { state: "error", message: { title: apiFailure(failure) } };
    }
  }

  async function addPerson(userId: number): Promise<FormSubmitResult> {
    try {
      await addToSpace(id, userId);
      await load();

      return { state: "success", message: { title: "Added to the space" } };
    } catch (failure) {
      return { state: "error", message: { title: apiFailure(failure) } };
    }
  }

  const inSpace = new Set(people.map((p) => p.id));
  const choices = organisation
    .filter((m) => !inSpace.has(m.id))
    .map((m) => ({ value: String(m.id), label: m.name }));

  return (
    <Stack gap="lg">
      <PageHeader title={space?.name ?? "Space"} />
      <Heading>Conversations</Heading>
      <DataTable
        data={conversations}
        columns={[
          { header: "Name", render: (c) => c.title },
          { header: "Kind", render: (c) => (c.kind === "channel" ? "Channel" : "Direct") },
        ]}
        getRowKey={(c) => c.id}
        onRowClick={(c) => void navigate(`/conversations/${c.id}`)}
        error={error}
        emptyMessage="No conversations yet."
      />
      {isAdmin && (
        <NameForm
          label="Channel name"
          submitLabel="Open channel"
          maxLength={100}
          onSubmit={openChannel}
        />
      )}
      <Heading>People</Heading>
      <DataTable
        data={people}
        columns={[
          { header: "Name", render: (p) => p.name },
          { header: "Username", render: (p) => p.username },
        ]}
        getRowKey={(p) => p.id}
        emptyMessage="Nobody is in this space."
      />
      {isAdmin && <AddToSpaceForm people={choices} onSubmit={addPerson} />}
    </Stack>
  );
}
