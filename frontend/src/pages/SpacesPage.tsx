import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { listSpaces, type Space } from "@/api/spaces";
import { useAuth } from "@/auth/AuthContext";
import AddButton from "@/components/button/AddButton";
import DataTable from "@/components/tables/DataTable";
import { PageHeader } from "@/components/typography";

import { apiFailure } from "./apiFailure";

/**
 * The spaces the person is in, at `/spaces`. An organisation admin can
 * make a new one.
 */
export default function SpacesPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = state.status === "authenticated" && state.user.is_admin;

  useEffect(() => {
    listSpaces()
      .then((found) => setSpaces(found))
      .catch((failure: unknown) => setError(apiFailure(failure)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg">
      <PageHeader
        title="Spaces"
        action={
          isAdmin ? (
            <AddButton label="New space" onClick={() => void navigate("/spaces/new")} />
          ) : undefined
        }
      />
      <DataTable
        data={spaces}
        columns={[{ header: "Name", render: (s) => s.name, accessor: (s) => s.name }]}
        getRowKey={(s) => s.id}
        onRowClick={(s) => void navigate(`/spaces/${s.id}`)}
        loading={loading}
        error={error}
        emptyMessage="You are not in any spaces yet."
      />
    </Stack>
  );
}
