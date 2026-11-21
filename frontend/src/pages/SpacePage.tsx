import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ApiError } from "@/api/client";
import {
  listConversations,
  startChannel,
  startDirect,
  type ConversationSummary,
} from "@/api/conversations";
import { listMembers, type Member } from "@/api/members";
import {
  addToSpace,
  getSpace,
  listSpaceMembers,
  type Space,
  type SpacePerson,
} from "@/api/spaces";
import { useAuth } from "@/auth/AuthContext";
import { UnreadBadge } from "@/components/badge";
import EllipsisMenu from "@/components/ellipsis-menu/EllipsisMenu";
import type { FormSubmitResult } from "@/components/form/Form";
import PageSpinner from "@/components/loading-spinner/PageSpinner";
import NotFoundLayout from "@/components/layouts/NotFoundLayout";
import { AddToSpaceForm, NameForm } from "@/components/spaces";
import DataTable from "@/components/tables/DataTable";
import { usePageMessage } from "@/components/page-message";
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
  const { showMessage } = usePageMessage();
  const [space, setSpace] = useState<Space | null>(null);
  const [missing, setMissing] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [people, setPeople] = useState<SpacePerson[]>([]);
  const [organisation, setOrganisation] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = state.status === "authenticated" && state.user.is_admin;
  const myId = state.status === "authenticated" ? state.user.id : 0;

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

  function open(conversation: ConversationSummary) {
    void navigate(`/conversations/${conversation.id}`, {
      state: { title: conversation.title },
    });
  }

  async function messagePerson(person: SpacePerson) {
    // A direct conversation with just this person is titled with their name.
    const existing = conversations.find((c) => c.kind === "direct" && c.title === person.name);
    if (existing !== undefined) {
      open(existing);
      return;
    }

    try {
      open(await startDirect(id, [person.id]));
    } catch (failure) {
      showMessage({ variant: "error", title: apiFailure(failure) });
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
          { header: "Unread", render: (c) => <UnreadBadge count={c.unread_count} /> },
        ]}
        getRowKey={(c) => c.id}
        onRowClick={open}
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
          {
            header: "",
            render: (p) =>
              p.id === myId ? null : (
                <EllipsisMenu
                  aria-label={`Actions for ${p.name}`}
                  items={[{ label: `Message ${p.name}`, onClick: () => void messagePerson(p) }]}
                />
              ),
          },
        ]}
        getRowKey={(p) => p.id}
        emptyMessage="Nobody is in this space."
      />
      {isAdmin && <AddToSpaceForm people={choices} onSubmit={addPerson} />}
    </Stack>
  );
}
