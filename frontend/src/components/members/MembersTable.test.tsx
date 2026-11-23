import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Member } from "@/api/members";
import { renderWithMantine } from "@/test/test-utils";

import MembersTable from "./MembersTable";

const alex: Member = { id: 2, username: "alex", name: "Alex Morgan", is_admin: false };
const sam: Member = { id: 1, username: "sam", name: "Sam Patel", is_admin: true };

function renderTable(onMakeAdmin = vi.fn(), onRemove = vi.fn()) {
  renderWithMantine(
    <MembersTable
      members={[alex, sam]}
      currentUserId={1}
      onMakeAdmin={onMakeAdmin}
      onRemove={onRemove}
    />,
  );
}

async function openMenu(name: string) {
  await userEvent.click(screen.getByRole("button", { name: `Actions for ${name}` }));

  return within(await screen.findByRole("menu"));
}

describe("MembersTable", () => {
  it("lists each member with their username and role", () => {
    renderTable();

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("alex")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("offers to make a member an admin, and to remove them", async () => {
    const onMakeAdmin = vi.fn();
    const onRemove = vi.fn();
    renderTable(onMakeAdmin, onRemove);

    const menu = await openMenu("Alex Morgan");
    await userEvent.click(menu.getByRole("menuitem", { name: "Make admin" }));

    expect(onMakeAdmin).toHaveBeenCalledWith(alex);

    await userEvent.click(
      (await openMenu("Alex Morgan")).getByRole("menuitem", { name: "Remove" }),
    );

    expect(onRemove).toHaveBeenCalledWith(alex);
  });

  it("gives the admin looking no way to remove themself, and an admin no 'Make admin'", () => {
    renderTable();

    expect(
      screen.queryByRole("button", { name: "Actions for Sam Patel" }),
    ).not.toBeInTheDocument();
  });
});
