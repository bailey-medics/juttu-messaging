---
paths:
  - "frontend/src/pages/**"
---

# Page conventions

- **Pages use only components from `frontend/src/components/`**, the
  Storybook catalogue. Do not place reusable UI inline in a page.
- **A page that needs a component that does not exist gets the component
  first.** Build it in `frontend/src/components/`, with its `.stories.tsx`
  and `.test.tsx`, following "Building views" in `AGENTS.md`, then use it
  in the page.
- **A new component built from scratch is planned and shown to a person
  first.** Reuse and composition need no plan.
