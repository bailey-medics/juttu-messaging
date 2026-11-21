import { MantineProvider } from "@mantine/core";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { routes } from "@/routes";
import { cssVariablesResolver, theme } from "@/theme";

/**
 * Render one element inside Juttu's theme, as the app would, with Mantine's
 * transitions off, as `renderWithMantine` has them, so a menu or modal is
 * there at once.
 */
export function renderWithTheme(element: ReactElement): RenderResult {
  return render(
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
      env="test"
    >
      {element}
    </MantineProvider>,
  );
}

/** Render the whole app at one address, with no browser history. */
export function renderAt(path: string): RenderResult {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return renderWithTheme(<RouterProvider router={router} />);
}

/** Make `fetch` answer every request with this JSON body and status. */
export function stubFetchJson(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

/** A signed-in session, as `GET /api/auth/me` answers it. */
export const SIGNED_IN = {
  authenticated: true,
  user: { id: 1, username: "sam", name: "Sam Patel", is_admin: true },
} as const;

/** Nobody signed in, as `GET /api/auth/me` answers it. */
export const SIGNED_OUT = { authenticated: false, user: null } as const;

/** One stubbed answer: a JSON body and a status. */
export interface StubAnswer {
  body: unknown;
  status?: number;
}

/**
 * Make `fetch` answer each API path with its own JSON body, such as
 * `{ "/api/auth/me": { body: SIGNED_IN } }`. A path not listed answers 404,
 * so a test never reaches the network by accident.
 */
export function stubFetchRoutes(answers: Record<string, StubAnswer>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const answer = answers[path] ?? { body: { detail: "Not found." }, status: 404 };

      const status = answer.status ?? 200;
      // A 204 has no body; Response refuses to be given one.
      const body = status === 204 ? null : JSON.stringify(answer.body);

      return new Response(body, { status });
    }),
  );
}

/** The app with somebody signed in and the backend up, at one address. */
export function renderSignedInAt(path: string): RenderResult {
  stubFetchRoutes({
    "/api/auth/me": { body: SIGNED_IN },
    "/api/health": { body: { status: "ok" } },
  });

  return renderAt(path);
}
