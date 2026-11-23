/**
 * Every story renders. Storybook's portable stories run each one here, with
 * the decorators from .storybook/preview.tsx, so a broken story fails the
 * unit tests and not only the Storybook build.
 */

import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { screen } from "@testing-library/react";

import * as previewAnnotations from "../.storybook/preview";
import * as homePageStories from "@/pages/HomePage.stories";

setProjectAnnotations(previewAnnotations);

/** A story file's exports, as `composeStories` takes them. */
type StoryFile = Parameters<typeof composeStories>[0];

/**
 * Every story file under src/, found by Vite, so a new story is tested
 * without being listed here.
 */
const storyFiles = import.meta.glob<StoryFile>("./**/*.stories.tsx", { eager: true });

/** A composed story, which can be run. */
interface RunnableStory {
  run: () => Promise<void>;
}

/** Whether a composed story can be run. */
function isRunnable(story: unknown): story is RunnableStory {
  return typeof story === "function" && "run" in story && typeof story.run === "function";
}

/** Every story, named by its file and its export. */
const everyStory: Array<[string, RunnableStory]> = Object.entries(storyFiles).flatMap(
  ([path, file]) =>
    Object.entries(composeStories(file)).flatMap(
      ([name, story]): Array<[string, RunnableStory]> =>
        isRunnable(story) ? [[`${path} ${name}`, story]] : [],
    ),
);

it("finds the story files", () => {
  expect(Object.keys(storyFiles).length).toBeGreaterThanOrEqual(10);
});

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
