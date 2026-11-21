/**
 * Every story renders. Storybook's portable stories run each one here, with
 * the decorators from .storybook/preview.tsx, so a broken story fails the
 * unit tests and not only the Storybook build.
 */

import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { screen } from "@testing-library/react";

import * as previewAnnotations from "../.storybook/preview";
import * as healthStatusStories from "@/components/health-status/HealthStatus.stories";
import * as installButtonStories from "@/components/install-button/InstallButton.stories";
import * as topRibbonStories from "@/components/ribbon/TopRibbon.stories";
import * as homePageStories from "@/pages/HomePage.stories";
import * as colourStories from "@/stories/Colours.stories";
import * as typographyStories from "@/stories/Typography.stories";

setProjectAnnotations(previewAnnotations);

/** Every story, named by its file and its export. */
const everyStory: Array<[string, { run: () => Promise<void> }]> = [
  ...named("HealthStatus", composeStories(healthStatusStories)),
  ...named("HomePage", composeStories(homePageStories)),
  ...named("InstallButton", composeStories(installButtonStories)),
  ...named("TopRibbon", composeStories(topRibbonStories)),
  ...named("Colours", composeStories(colourStories)),
  ...named("Typography", composeStories(typographyStories)),
];

function named(
  file: string,
  stories: Record<string, { run: () => Promise<void> }>,
): Array<[string, { run: () => Promise<void> }]> {
  return Object.entries(stories).map(([name, story]) => [`${file} ${name}`, story]);
}

it.each(everyStory)("%s renders", async (_name, Story) => {
  await Story.run();

  expect(document.body).not.toBeEmptyDOMElement();
});

describe("HomePage stories", () => {
  it("BackendUp shows the backend as up", async () => {
    const { BackendUp } = composeStories(homePageStories);

    await BackendUp.run();

    expect(await screen.findByText("Backend up")).toBeInTheDocument();
  });
});

describe("InstallButton stories", () => {
  it("Offered shows the install button", async () => {
    const { Offered } = composeStories(installButtonStories);

    await Offered.run();

    expect(screen.getByRole("button", { name: "Install Juttu" })).toBeInTheDocument();
  });
});
