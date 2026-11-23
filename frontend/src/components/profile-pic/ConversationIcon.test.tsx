import { screen } from "@testing-library/react";

import { CONVERSATION_ICONS } from "@/api/conversations";
import { renderWithMantine } from "@/test/test-utils";

import ConversationIcon from "./ConversationIcon";

describe("ConversationIcon", () => {
  it("is named by its conversation, for a screen reader", () => {
    renderWithMantine(<ConversationIcon icon="rocket" colour={4} label="dev-CI" />);

    expect(screen.getByRole("img", { name: "dev-CI" })).toBeInTheDocument();
  });

  it.each(CONVERSATION_ICONS)("draws the %s icon", (icon) => {
    const { container } = renderWithMantine(
      <ConversationIcon icon={icon} colour={0} label="general" />,
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("falls back to the first colour for one out of range", () => {
    renderWithMantine(<ConversationIcon icon="sun" colour={99} label="general" />);

    expect(screen.getByRole("img", { name: "general" })).toBeInTheDocument();
  });
});
