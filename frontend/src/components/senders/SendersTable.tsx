/**
 * The organisation's senders, one row each: name, the channel its cards
 * land in, whether it is open, and a menu to close it. Built from
 * `DataTable`, `ActiveStatusBadge` and `EllipsisMenu`, so it turns into
 * cards on a phone.
 */

import type { Sender } from "@/api/senders";
import { ActiveStatusBadge } from "@/components/badge";
import EllipsisMenu from "@/components/ellipsis-menu/EllipsisMenu";
import DataTable, { type Column } from "@/components/tables/DataTable";

export interface SendersTableProps {
  senders: Sender[];
  onClose: (sender: Sender) => void;
  loading?: boolean;
  error?: string | null;
}

/** "Release / deploys": the space, then the channel. */
function channelLabel(sender: Sender): string {
  return `${sender.channel.space.name} / ${sender.channel.name}`;
}

export default function SendersTable({
  senders,
  onClose,
  loading = false,
  error = null,
}: SendersTableProps) {
  const columns: Column<Sender>[] = [
    { header: "Name", render: (s) => s.name },
    { header: "Channel", render: channelLabel },
    {
      header: "Status",
      render: (s) => <ActiveStatusBadge active={s.closed_at === null} inactiveLabel="Closed" />,
    },
    {
      header: "",
      render: (s) =>
        s.closed_at !== null ? null : (
          <EllipsisMenu
            aria-label={`Actions for ${s.name}`}
            items={[{ label: "Close", color: "var(--alert-color)", onClick: () => onClose(s) }]}
          />
        ),
    },
  ];

  return (
    <DataTable
      data={senders}
      columns={columns}
      getRowKey={(s) => s.id}
      loading={loading}
      error={error}
      emptyMessage="No senders yet."
    />
  );
}
