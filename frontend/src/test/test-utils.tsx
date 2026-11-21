/**
 * Render helpers with Quill Medical's names, so the components and tests
 * ported from Quill run unchanged. `render.tsx` holds Juttu's own.
 */

/* eslint-disable react-refresh/only-export-components */

import { MantineProvider } from "@mantine/core";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

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
): RenderResult {
  const { initialRoute = "/", ...rest } = options ?? {};
  const router = createMemoryRouter([{ path: "*", element: ui }], {
    initialEntries: [initialRoute],
  });

  return render(<RouterProvider router={router} />, { wrapper: MantineWrapper, ...rest });
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
