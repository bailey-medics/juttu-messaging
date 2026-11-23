import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { listMembers, makeAdmin, removeMember, type Member } from "@/api/members";
import { useAuth } from "@/auth/AuthContext";
import AddButton from "@/components/button/AddButton";
import ConfirmModal from "@/components/confirm-modal/ConfirmModal";
import { MembersTable } from "@/components/members";
import { usePageMessage } from "@/components/page-message";
import { BodyText, PageHeader } from "@/components/typography";

import { membersFailure } from "./membersFailure";

/** A change waiting for the admin to confirm it. */
type Pending = { action: "remove" | "make-admin"; member: Member };

/**
 * The organisation's members, at `/members`, for an organisation admin:
 * who is in it, who is an admin, and a way to add, remove and promote.
 */
export default function MembersPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const { showMessage } = usePageMessage();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const currentUserId = state.status === "authenticated" ? state.user.id : 0;

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers());
      setError(null);
    } catch (failure) {
      setError(membersFailure(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The members load once the page opens; the answer arrives later.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void load();
  }, [load]);

  async function confirm() {
    if (pending === null) {
      return;
    }

    const { action, member } = pending;

    try {
      if (action === "remove") {
        await removeMember(member.id);
        showMessage({ variant: "success", title: `${member.name} removed` });
      } else {
        await makeAdmin(member.id);
        showMessage({ variant: "success", title: `${member.name} is now an admin` });
      }
    } catch (failure) {
      showMessage({ variant: "error", title: membersFailure(failure) });
    }

    setPending(null);
    await load();
  }

  const removing = pending?.action === "remove";
  const name = pending?.member.name ?? "";

  return (
    <Stack gap="lg">
      <PageHeader
        title="Members"
        action={<AddButton label="Add member" onClick={() => void navigate("/members/new")} />}
      />
      <MembersTable
        members={members}
        currentUserId={currentUserId}
        loading={loading}
        error={error}
        onMakeAdmin={(member) => setPending({ action: "make-admin", member })}
        onRemove={(member) => setPending({ action: "remove", member })}
      />
      <ConfirmModal
        opened={pending !== null}
        onClose={() => setPending(null)}
        onAccept={confirm}
        title={removing ? "Remove member" : "Make admin"}
        acceptLabel={removing ? "Remove" : "Make admin"}
        destructive={removing}
      >
        <BodyText>
          {removing
            ? `${name} will be signed out and will not be able to sign in again.`
            : `${name} will be able to add and remove members, and make other admins.`}
        </BodyText>
      </ConfirmModal>
    </Stack>
  );
}
