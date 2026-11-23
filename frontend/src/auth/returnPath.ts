/** The page `RequireAuth` sent somebody from, if it is a path in this app. */
export function returnPath(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = state.from;

    // Only a path inside the app: never "//elsewhere" or a backslash in place of the second slash,
    // which a browser reads as another site.
    const inside = typeof from === "string" && /^\/(?![/\\])/.test(from);

    if (inside) {
      return from;
    }
  }

  return "/";
}
