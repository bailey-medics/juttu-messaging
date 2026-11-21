/**
 * Juttu's icon register. Ported from Quill Medical's.
 *
 * The one place Tabler icons are imported. Components import icons from
 * here, never straight from "@tabler/icons-react". To add an icon, import
 * it below, then add it to both the re-export and `iconCatalogue`, which
 * the icon stories show.
 *
 * Phase 1 of the Quill components plan brings only the icon typography
 * needs; Phase 2 brings the rest of Quill's register.
 */

import { IconAlertCircle } from "@tabler/icons-react";

export { IconAlertCircle };

/** Every icon in the register, by name, for the icon stories. */
export const iconCatalogue = {
  IconAlertCircle,
};
