import { useEffect } from "react";

import { sayLooking } from "@/api/push";

/** How often an open, visible conversation says so. The mark lasts a minute. */
export const LOOKING_EVERY_MS = 30_000;

/**
 * Tell the backend, every half minute, that the person has conversation
 * *conversationId* on screen, so they are not sent a push about it. Says so
 * at once when the page comes back into view, and that they have stopped
 * when it is hidden or left. A failure only means a push they did not
 * need, so it is not shown.
 */
export function useLooking(conversationId: number): void {
  useEffect(() => {
    if (!Number.isInteger(conversationId)) {
      return;
    }

    const say = (looking: boolean) => {
      sayLooking(conversationId, looking).catch(() => {});
    };
    const sayIfVisible = () => {
      say(document.visibilityState === "visible");
    };

    sayIfVisible();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        say(true);
      }
    }, LOOKING_EVERY_MS);
    document.addEventListener("visibilitychange", sayIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sayIfVisible);
      say(false);
    };
  }, [conversationId]);
}
