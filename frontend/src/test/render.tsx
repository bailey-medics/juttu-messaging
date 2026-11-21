import { MantineProvider } from "@mantine/core";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { routes } from "@/routes";
import { cssVariablesResolver, theme } from "@/theme";

/** Render one element inside Juttu's theme, as the app would. */
export function renderWithTheme(element: ReactElement): RenderResult {
  return render(
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
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
