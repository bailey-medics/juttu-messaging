/**
 * A conversation's own icon, in a circle the size of a `ProfilePic`: the
 * friendly Tabler icon picked for it at random, on one of the profile
 * pictures' gradients, or the image an admin uploaded in its place. Home
 * shows it in place of people's circles, for a conversation with too many
 * people or with its circles turned off.
 */

import { Avatar } from "@mantine/core";
import type { ReactElement } from "react";

import type { ConversationIconName } from "@/api/conversations";
import Icon from "@/components/icons/Icon";
import {
  IconAnchor,
  IconBolt,
  IconCloud,
  IconCoffee,
  IconCompass,
  IconFlame,
  IconLeaf,
  IconMusic,
  IconPlanet,
  IconRocket,
  IconStar,
  IconSun,
} from "@/components/icons/appIcons";
import type { AppIconElement } from "@/components/icons/Icon";
import AppTooltip from "@/components/tooltip/AppTooltip";

import { AVATAR_GRADIENTS } from "./gradients";

type ConversationIconSize = "sm" | "md" | "lg";

/** Each icon the backend may send, drawn. */
const ICONS: Record<ConversationIconName, AppIconElement> = {
  anchor: <IconAnchor />,
  bolt: <IconBolt />,
  cloud: <IconCloud />,
  coffee: <IconCoffee />,
  compass: <IconCompass />,
  flame: <IconFlame />,
  leaf: <IconLeaf />,
  music: <IconMusic />,
  planet: <IconPlanet />,
  rocket: <IconRocket />,
  star: <IconStar />,
  sun: <IconSun />,
};

/** The circle's width in pixels, and the icon's size inside it, as `ProfilePic`'s. */
const SIZES: Record<ConversationIconSize, { circle: number; icon: "sm" | "md" | "lg" }> = {
  sm: { circle: 32, icon: "sm" },
  md: { circle: 48, icon: "md" },
  lg: { circle: 64, icon: "lg" },
};

export interface ConversationIconProps {
  /** The conversation's icon, by name. */
  icon: ConversationIconName;
  /** Which gradient it sits on, 0 to 29. */
  colour: number;
  /** The conversation's name, said by a screen reader and shown on hover. */
  label: string;
  /** sm (32px), md (48px) or lg (64px), as a `ProfilePic`. */
  size?: ConversationIconSize;
  /** An uploaded image, drawn in place of the icon, or null for none. */
  src?: string | null;
}

export default function ConversationIcon({
  icon,
  colour,
  label,
  size = "md",
  src = null,
}: ConversationIconProps): ReactElement {
  // A colour out of range falls back to the first gradient, as the list
  // is never empty.
  const gradient = AVATAR_GRADIENTS[colour] ?? AVATAR_GRADIENTS[0];
  const { circle, icon: iconSize } = SIZES[size];

  if (src !== null) {
    return (
      <AppTooltip label={label}>
        <Avatar radius="xl" size={circle} src={src} alt={label} />
      </AppTooltip>
    );
  }

  return (
    <AppTooltip label={label}>
      <Avatar
        radius="xl"
        size={circle}
        role="img"
        aria-label={label}
        styles={{
          root: {
            background: `linear-gradient(135deg, ${gradient.colorFrom} 0%, ${gradient.colorTo} 100%)`,
          },
          placeholder: { background: "transparent" },
        }}
      >
        <Icon icon={ICONS[icon]} size={iconSize} colour="var(--mantine-color-black)" />
      </Avatar>
    </AppTooltip>
  );
}
