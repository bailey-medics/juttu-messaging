import type { Meta, StoryObj } from "@storybook/react-vite";

import { CONVERSATION_ICONS } from "@/api/conversations";
import { VariantRow, VariantStack } from "@/stories/variants";

import ConversationIcon from "./ConversationIcon";

const meta: Meta<typeof ConversationIcon> = {
  title: "Profile pics/Conversation icon",
  component: ConversationIcon,
  args: { icon: "rocket", colour: 4, label: "dev-CI", size: "md" },
};

export default meta;
type Story = StoryObj<typeof ConversationIcon>;

/** One conversation's icon, as Home shows it. */
export const Default: Story = {};

/** Every icon a conversation may be given, each on its own colour. */
export const AllIcons: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Every icon">
        {CONVERSATION_ICONS.map((icon, index) => (
          <ConversationIcon key={icon} icon={icon} colour={index * 2} label={icon} />
        ))}
      </VariantRow>
      <VariantRow label="Sizes: small, medium and large">
        <ConversationIcon icon="leaf" colour={10} label="small" size="sm" />
        <ConversationIcon icon="leaf" colour={10} label="medium" size="md" />
        <ConversationIcon icon="leaf" colour={10} label="large" size="lg" />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = { globals: { colorScheme: "dark" } };
