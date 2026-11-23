import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createMemoryRouter, RouterProvider } from "react-router";

import RootLayout from "@/RootLayout";
import { routes } from "@/routes";
import AuthRoot from "@/auth/AuthRoot";
import { CANNOT_REACH } from "@/auth/CannotReach";
import {
  renderAt,
  renderSignedInAt,
  renderWithTheme,
  SIGNED_IN,
  SIGNED_OUT,
  stubFetchRoutes,
} from "@/test/render";

describe("routes", () => {
  it("shows the home page at /", async () => {
    renderSignedInAt("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Conversations" }),
    ).toBeInTheDocument();
  });

  it("shows every page inside the root layout's header", async () => {
    renderSignedInAt("/");

    expect(await screen.findByRole("banner")).toHaveTextContent("Juttu");
  });

  it("puts Quill's top ribbon in the header, with Juttu's name linking home", async () => {
    renderSignedInAt("/");

    const header = await screen.findByRole("banner");
    expect(within(header).getByRole("link", { name: "Juttu" })).toHaveAttribute("href", "/");
  });

  it("gives the ribbon no right section while no install is on offer", async () => {
    renderSignedInAt("/");

    const header = await screen.findByRole("banner");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
    expect(header.querySelectorAll("a ~ div")).toHaveLength(1);
  });

  it("shows the not found page for an unknown address", async () => {
    renderSignedInAt("/no/such/page");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("keeps the ribbon and shows the fallback when a page throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_IN } });
    function Broken(): never {
      throw new Error("This page broke");
    }
    const router = createMemoryRouter([
      {
        element: <AuthRoot />,
        children: [
          { element: <RootLayout />, children: [{ index: true, element: <Broken /> }] },
        ],
      },
    ]);

    renderWithTheme(<RouterProvider router={router} />);

    expect(await screen.findByRole("banner")).toHaveTextContent("Juttu");
    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
  });

  it("gives the root route Juttu's error page and its page spinner", () => {
    const [root] = routes;

    expect(root?.errorElement).toBeDefined();
    expect(root?.hydrateFallbackElement).toBeDefined();
  });
});

describe("signing in and out", () => {
  it("sends somebody not signed in to the sign-in page", async () => {
    stubFetchRoutes({ "/api/auth/me": { body: SIGNED_OUT } });

    renderAt("/no/such/page");

    expect(
      await screen.findByRole("heading", { name: "Sign in to Juttu" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("brings them back to the page they asked for once signed in", async () => {
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_OUT },
      "/api/auth/sign-in": { body: SIGNED_IN },
    });
    renderAt("/no/such/page");

    await userEvent.type(await screen.findByLabelText(/Username/), "sam");
    await userEvent.type(screen.getByLabelText(/Password/), "a long enough password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("shows the backend's message when the password is wrong", async () => {
    const message = "That username and password do not match an account.";
    stubFetchRoutes({
      "/api/auth/me": { body: SIGNED_OUT },
      "/api/auth/sign-in": { body: { detail: message }, status: 400 },
    });
    renderAt("/sign-in");

    await userEvent.type(await screen.findByLabelText(/Username/), "sam");
    await userEvent.type(screen.getByLabelText(/Password/), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("sends somebody already signed in from the sign-in page to home", async () => {
    renderSignedInAt("/sign-in");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Conversations" }),
    ).toBeInTheDocument();
  });

  it("signs out from the side navigation, back to the sign-in page", async () => {
    renderSignedInAt("/");
    stubFetchRoutes({ "/api/auth/sign-out": { body: SIGNED_OUT } });
    const nav = within(await screen.findByRole("complementary"));

    await userEvent.click(nav.getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in to Juttu" }),
    ).toBeInTheDocument();
  });

  it("says Juttu cannot be reached, rather than asking to sign in again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("no network"))),
    );

    renderAt("/");

    expect(await screen.findByText(CANNOT_REACH)).toBeInTheDocument();
  });
});
