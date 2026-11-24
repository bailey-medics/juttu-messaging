/**
 * An organisation admin's menu on a channel's page: whether Home shows the
 * channel's people, and the channel's own icon. Built from `EllipsisMenu`
 * and `ConfirmModal`, with a file picker for the icon that only images
 * can be chosen in.
 */

import { useState } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import EllipsisMenu, { type EllipsisMenuItem } from "@/components/ellipsis-menu/EllipsisMenu";
import { IconEye, IconEyeOff, IconTrash, IconUpload } from "@/components/icons/appIcons";
import { BodyText } from "@/components/typography";

/** The image types the backend takes. */
const ACCEPTED_IMAGES = "image/png,image/jpeg,image/webp";

export interface ChannelMenuProps {
  /** Whether Home shows the channel's people's circles now. */
  showsPeople: boolean;
  /** Whether the channel has an uploaded icon now. */
  hasUploadedIcon: boolean;
  /** Turn the circles on or off. */
  onToggleShowsPeople: () => void;
  /** Make *image* the channel's icon. */
  onUploadIcon: (image: File) => void;
  /** Take the uploaded icon away, once confirmed. */
  onRemoveIcon: () => void | Promise<void>;
}

export default function ChannelMenu({
  showsPeople,
  hasUploadedIcon,
  onToggleShowsPeople,
  onUploadIcon,
  onRemoveIcon,
}: ChannelMenuProps) {
  // The file input, held once it is drawn, so "Upload icon" can open it.
  const [picker, setPicker] = useState<HTMLInputElement | null>(null);
  const [confirming, setConfirming] = useState(false);

  const items: EllipsisMenuItem[] = [
    showsPeople
      ? { label: "Hide people's circles", icon: <IconEyeOff />, onClick: onToggleShowsPeople }
      : { label: "Show people's circles", icon: <IconEye />, onClick: onToggleShowsPeople },
    { label: "Upload icon", icon: <IconUpload />, onClick: () => picker?.click() },
  ];

  if (hasUploadedIcon) {
    items.push({
      label: "Remove icon",
      icon: <IconTrash />,
      onClick: () => setConfirming(true),
    });
  }

  return (
    <>
      <EllipsisMenu aria-label="Channel actions" items={items} />
      {/* The browser's own file picker, opened from "Upload icon". */}
      <input
        ref={setPicker}
        type="file"
        accept={ACCEPTED_IMAGES}
        hidden
        aria-label="Channel icon image"
        onChange={(event) => {
          const chosen = event.currentTarget.files?.[0];
          // Cleared, so choosing the same file again still counts.
          event.currentTarget.value = "";
          if (chosen !== undefined) {
            onUploadIcon(chosen);
          }
        }}
      />
      <ConfirmModal
        opened={confirming}
        onClose={() => setConfirming(false)}
        onAccept={async () => {
          await onRemoveIcon();
          setConfirming(false);
        }}
        title="Remove the icon?"
        acceptLabel="Remove icon"
        destructive
      >
        <BodyText>The channel goes back to the icon Juttu picked for it.</BodyText>
      </ConfirmModal>
    </>
  );
}
