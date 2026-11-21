import type { RouteObject } from "react-router";

import AuthRoot from "@/auth/AuthRoot";
import GuestOnly from "@/auth/GuestOnly";
import RequireAdmin from "@/auth/RequireAdmin";
import RequireAuth, { SIGN_IN_PATH } from "@/auth/RequireAuth";
import RouteErrorFallback from "@/components/error-boundary/RouteErrorFallback";
import PageSpinner from "@/components/loading-spinner/PageSpinner";
import AddMemberPage from "@/pages/AddMemberPage";
import HomePage from "@/pages/HomePage";
import MembersPage from "@/pages/MembersPage";
import NotFoundPage from "@/pages/NotFoundPage";
import SignInPage from "@/pages/SignInPage";
import RootLayout from "@/RootLayout";

/**
 * Every page Juttu has. The sign-in page stands alone; every other page
 * needs somebody signed in, and sits inside the root layout.
 */
export const routes: RouteObject[] = [
  {
    element: <AuthRoot />,
    // A route that fails before it renders shows Juttu's fallback page, not
    // the router's own developer screen.
    errorElement: <RouteErrorFallback />,
    // Shown while the router is still loading a page.
    hydrateFallbackElement: <PageSpinner />,
    children: [
      {
        path: SIGN_IN_PATH,
        element: (
          <GuestOnly>
            <SignInPage />
          </GuestOnly>
        ),
      },
      {
        element: (
          <RequireAuth>
            <RootLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <HomePage /> },
          {
            path: "members",
            element: (
              <RequireAdmin feature="Members">
                <MembersPage />
              </RequireAdmin>
            ),
          },
          {
            path: "members/new",
            element: (
              <RequireAdmin feature="Members">
                <AddMemberPage />
              </RequireAdmin>
            ),
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
