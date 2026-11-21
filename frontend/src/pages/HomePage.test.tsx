import { screen } from "@testing-library/react";

import { renderAt, stubFetchJson } from "@/test/render";

describe("HomePage", () => {
  it("says the backend is up when the health check answers", async () => {
    stubFetchJson({ status: "ok" });

    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(await screen.findByText("Backend up")).toBeInTheDocument();
  });

  it("says the backend is down when the health check fails", async () => {
    stubFetchJson({ detail: "unavailable" }, 502);

    renderAt("/");

    expect(await screen.findByText("Backend down")).toBeInTheDocument();
  });

  it("shows that it is checking before the answer comes", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    renderAt("/");

    expect(screen.getByText("Checking")).toBeInTheDocument();
  });
});
