import { Outlet } from "react-router";

import AuthProvider from "./AuthProvider";

/** The top of the route tree: every page can ask who is signed in. */
export default function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
