import { Stack } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { closeSender, listSenders, type Sender } from "@/api/senders";
import AddButton from "@/components/button/AddButton";
import ConfirmModal from "@/components/confirm-modal/ConfirmModal";
import { usePageMessage } from "@/components/page-message";
import { SendersTable } from "@/components/senders";
import { BodyText, PageHeader } from "@/components/typography";

import { sendersFailure } from "./sendersFailure";

/**
 * The organisation's senders, at `/senders`, for an organisation admin. A
 * sender is an outside tool, such as the box's deploy script, whose events
 * update cards in a channel. An admin registers one, or closes one.
 */
export default function SendersPage() {
  const navigate = useNavigate();
  const { showMessage } = usePageMessage();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState<Sender | null>(null);

  const load = useCallback(async () => {
    try {
      setSenders(await listSenders());
      setError(null);
    } catch (failure) {
      setError(sendersFailure(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The senders load once the page opens; the answer arrives later.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void load();
  }, [load]);

  async function confirmClose() {
    if (closing === null) {
      return;
    }

    try {
      await closeSender(closing.id);
      showMessage({ variant: "success", title: `${closing.name} closed` });
    } catch (failure) {
      showMessage({ variant: "error", title: sendersFailure(failure) });
    }

    setClosing(null);
    await load();
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="Senders"
        action={
          <AddButton label="Register sender" onClick={() => void navigate("/senders/new")} />
        }
      />
      <BodyText>
        Outside tools, such as the box&apos;s deploy script, that keep cards up to date in a
        channel.
      </BodyText>
      <SendersTable
        senders={senders}
        loading={loading}
        error={error}
        onClose={(sender) => setClosing(sender)}
      />
      <ConfirmModal
        opened={closing !== null}
        onClose={() => setClosing(null)}
        onAccept={confirmClose}
        title="Close sender"
        acceptLabel="Close sender"
        destructive
      >
        <BodyText>
          {`${closing?.name ?? ""} will be refused from now on. Its cards stay where they are. This cannot be undone: register it again for a new secret.`}
        </BodyText>
      </ConfirmModal>
    </Stack>
  );
}
