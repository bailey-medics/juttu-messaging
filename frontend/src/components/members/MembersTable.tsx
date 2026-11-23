/**
 * The organisation's members, one row each: name, username, role and a menu
 * to make the member an admin or remove them. Built from `DataTable` and
 * `EllipsisMenu`, so it turns into cards on a phone.
 *
 * The person looking has no "Remove" on their own row: the backend refuses
 * it, because an admin removing themself could leave nobody to run things.
 */

import type { Member } from "@/api/members";
import EllipsisMenu, { type EllipsisMenuItem } from "@/components/ellipsis-menu/EllipsisMenu";
import DataTable, { type Column } from "@/components/tables/DataTable";

export interface MembersTableProps {
  members: Member[];
  /** The signed-in admin's own id, whose row offers no "Remove". */
  currentUserId: number;
  onMakeAdmin: (member: Member) => void;
  onRemove: (member: Member) => void;
  loading?: boolean;
  error?: string | null;
}

/** "Admin" or "Member", as the role column shows it. */
function roleOf(member: Member): string {
  return member.is_admin ? "Admin" : "Member";
}

export default function MembersTable({
  members,
  currentUserId,
  onMakeAdmin,
  onRemove,
  loading = false,
  error = null,
}: MembersTableProps) {
  function actionsFor(member: Member): EllipsisMenuItem[] {
    const items: EllipsisMenuItem[] = [];

    if (!member.is_admin) {
      items.push({ label: "Make admin", onClick: () => onMakeAdmin(member) });
    }

    if (member.id !== currentUserId) {
      items.push({
        label: "Remove",
        color: "var(--alert-color)",
        onClick: () => onRemove(member),
      });
    }

    return items;
  }

  const columns: Column<Member>[] = [
    { header: "Name", render: (m) => m.name, accessor: (m) => m.name },
    { header: "Username", render: (m) => m.username, accessor: (m) => m.username },
    { header: "Role", render: roleOf, accessor: roleOf },
    {
      header: "",
      render: (m) => {
        const items = actionsFor(m);

        return items.length === 0 ? null : (
          <EllipsisMenu aria-label={`Actions for ${m.name}`} items={items} />
        );
      },
    },
  ];

  return (
    <DataTable
      data={members}
      columns={columns}
      getRowKey={(m) => m.id}
      loading={loading}
      error={error}
      emptyMessage="No members yet."
    />
  );
}
