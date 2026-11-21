/**
 * Render helpers with Quill Medical's names, so the components and tests
 * ported from Quill run unchanged. `render.tsx` holds Juttu's own.
 */

/* eslint-disable react-refresh/only-export-components */

import { MantineProvider } from "@mantine/core";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { PageMessageProvider } from "@/components/page-message";
import PageMessageDisplay from "@/components/page-message/PageMessageDisplay";
import { cssVariablesResolver, theme } from "@/theme";

function MantineWrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
      {children}
    </MantineProvider>
  );
}

/** Render with Juttu's theme, for a component that needs no router. */
export function renderWithMantine(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return render(ui, { wrapper: MantineWrapper, ...options });
}

/** Render inside a router and Juttu's theme, for a component that links. */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialRoute?: string },
): RenderResult & { router: ReturnType<typeof createMemoryRouter> } {
  const { initialRoute = "/", ...rest } = options ?? {};
  // As Quill Medical's helper does: the page-message provider around the
  // page, so a page's status messages show as they do in the app.
  const page = (
    <PageMessageProvider>
      <PageMessageDisplay fallback />
      {ui}
    </PageMessageProvider>
  );
  const router = createMemoryRouter([{ path: "*", element: page }], {
    initialEntries: [initialRoute],
  });

  // The router comes back too, so a test can read where a link went:
  // a memory router leaves `window.location` alone.
  const result = render(<RouterProvider router={router} />, {
    wrapper: MantineWrapper,
    ...rest,
  });

  return { ...result, router };
}

/**
 * One class name from a CSS module, failing the test if the stylesheet
 * does not define it, so `toHaveClass` is never handed `undefined`.
 */
export function cssClass(classes: CSSModuleClasses, name: string): string {
  const value = classes[name];

  if (value === undefined) {
    throw new Error(`The CSS module has no class named ${name}`);
  }

  return value;
}

/**
 * A CSS length in rem as the browser computes it in px, at a 16px root, as
 * Quill Medical's helper does: "2.1rem" becomes "33.6px". Other parts are
 * left as they are.
 */
export function remToPx(value: string, rootFontSize = 16): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => {
      const match = /^(-?(?:\d*\.)?\d+)rem$/.exec(part);
      const number = match?.[1];

      if (number === undefined) {
        return part;
      }

      const px = Number(number) * rootFontSize;

      // Trim floating-point noise (2.1rem * 16 = 33.6, not 33.599999999999994)
      return `${Number(px.toFixed(5))}px`;
    })
    .join(" ");
}
