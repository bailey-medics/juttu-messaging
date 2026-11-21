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
- **Buttons sit on the right.** A pair of actions is a `ButtonPair` or
  `ButtonPairRed`, and a button on its own is wrapped in
  `<Group justify="flex-end">`, as in Quill Medical.
- **A new page shows a child navigation link while it is open.** Give the
  side navigation entry it sits under a child link for it, in
  `frontend/src/components/navigation/navItems.ts`, using
  `NestedNavLink`'s `children`. The child shows only while that page is
  open, and is marked as the page you are on, so somebody can see where
  they are without the menu gaining a permanent entry. Leave it out only
  where a child would mislead, and say why in a comment.
