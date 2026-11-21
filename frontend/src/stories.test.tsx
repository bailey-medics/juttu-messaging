/**
 * Every story renders. Storybook's portable stories run each one here, with
 * the decorators from .storybook/preview.tsx, so a broken story fails the
 * unit tests and not only the Storybook build.
 */

import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { screen } from "@testing-library/react";

import * as previewAnnotations from "../.storybook/preview";
import * as healthStatusStories from "@/components/health-status/HealthStatus.stories";
import * as homePageStories from "@/pages/HomePage.stories";

setProjectAnnotations(previewAnnotations);

const storyFiles = { healthStatusStories, homePageStories };

describe.each(Object.entries(storyFiles))("%s", (_file, stories) => {
  it.each(Object.entries(composeStories(stories)))("%s renders", async (_name, Story) => {
    await Story.run();

    expect(document.body).not.toBeEmptyDOMElement();
  });
});

describe("HomePage stories", () => {
  it("BackendUp shows the backend as up", async () => {
    const { BackendUp } = composeStories(homePageStories);

    await BackendUp.run();

    expect(await screen.findByText("Backend up")).toBeInTheDocument();
  });
});
